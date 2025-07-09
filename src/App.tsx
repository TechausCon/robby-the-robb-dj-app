import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Deck } from './components/Deck/Deck';
import { Mixer } from './components/Mixer/Mixer';
import { MidiIndicator } from './components/MidiIndicator';
import { AITip } from './components/AITip';
import { FileExplorer } from './components/FileExplorer';
import { useMidi } from './hooks/useMidi';
import type { DeckState, Action, DeckId, Track } from '../types';
import { deckReducer } from './reducers/deckReducer';
import { findActionForMidiMessage } from './services/midiMap';
import { getDjTip } from './services/geminiService';
import analyzeBpm from 'bpm-detective';
import jsmediatags from 'jsmediatags';
import RobbyLogo from '../assets/robby-logo.png';

async function getAccurateBeatGrid(audioBuffer: AudioBuffer, bpm: number): Promise<number[]> {
  const offlineContext = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  const filter = offlineContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  filter.Q.value = 1;
  source.connect(filter);
  filter.connect(offlineContext.destination);
  source.start(0);

  const renderedBuffer = await offlineContext.startRendering();
  const data = renderedBuffer.getChannelData(0);
  const beatIntervalSeconds = 60 / bpm;
  const beatIntervalSamples = Math.floor(beatIntervalSeconds * audioBuffer.sampleRate);
  const onsets = [];
  const threshold = 0.3;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > threshold && data[i] > (data[i - 1] || 0)) {
      onsets.push(i);
      i += beatIntervalSamples / 4;
    }
  }

  if (onsets.length < 4) {
    const simpleGrid = [];
    for (let i = 0; i < audioBuffer.duration; i += beatIntervalSeconds) simpleGrid.push(i);
    return simpleGrid;
  }
  const intervals = [];
  for (let i = 1; i < onsets.length; i++) {
    const interval = (onsets[i] - onsets[i - 1]) / audioBuffer.sampleRate;
    intervals.push(interval);
  }
  const groupedIntervals = intervals.reduce((acc, interval) => {
    const rounded = parseFloat(interval.toFixed(2));
    acc[rounded] = (acc[rounded] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  let mostCommonInterval = 0;
  let maxCount = 0;
  for (const interval in groupedIntervals) {
    if (groupedIntervals[interval] > maxCount) {
      maxCount = groupedIntervals[interval];
      mostCommonInterval = parseFloat(interval);
    }
  }
  const firstBeat = onsets[0] / audioBuffer.sampleRate;
  const beatGrid = [firstBeat];
  let currentBeat = firstBeat;

  while (currentBeat + mostCommonInterval < audioBuffer.duration) {
    currentBeat += mostCommonInterval;
    beatGrid.push(currentBeat);
  }
  return beatGrid;
}

const baseInitialState: Omit<DeckState, 'id'> = {
  volume: 85,
  low: 50,
  mid: 50,
  high: 50,
  filter: 50,
  isPlaying: false,
  track: null,
  progress: 0,
  cuePoint: 0,
  playbackRate: 1,
  syncedTo: null,
};

const initialDeckAState: DeckState = { ...baseInitialState, id: 'A' };
const initialDeckBState: DeckState = { ...baseInitialState, id: 'B' };

const App = (): React.ReactElement => {
  const [deckAState, dispatchA] = React.useReducer(deckReducer, initialDeckAState);
  const [deckBState, dispatchB] = React.useReducer(deckReducer, initialDeckBState);
  const [crossfader, setCrossfader] = useState<number>(50);
  const [aiTip, setAiTip] = useState<string>('');
  const [isLoadingTip, setIsLoadingTip] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<DeckId, string | null>>({ A: null, B: null });
  const [library, setLibrary] = useState<File[]>([]);

  const audioA = useRef<HTMLAudioElement>(null);
  const audioB = useRef<HTMLAudioElement>(null);
  const syncTimeoutRefA = useRef<number | null>(null);
  const syncTimeoutRefB = useRef<number | null>(null);

  const { lastMessage, midiDeviceName } = useMidi();

  const handleFilesAdded = (files: FileList) => {
    const newFiles = Array.from(files);
    const uniqueNewFiles = newFiles.filter(newFile =>
      !library.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)
    );
    setLibrary(prevLibrary => [...prevLibrary, ...uniqueNewFiles].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleLoadTrack = useCallback(
    async (deckId: DeckId, file: File) => {
      setLoadingStates(prev => ({ ...prev, [deckId]: 'Lade Datei...' }));

      let currentAudioContext = audioContext;
      if (!currentAudioContext) {
        try {
          currentAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          setAudioContext(currentAudioContext);
        } catch (e) {
          console.error('Web Audio API is not supported in this browser.', e);
          setLoadingStates(prev => ({ ...prev, [deckId]: null }));
          return;
        }
      }

      const dispatch = deckId === 'A' ? dispatchA : dispatchB;
      const url = URL.createObjectURL(file);
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer.slice(0));

      const trackForAnalysis: Track = { name: file.name, url: url, audioBuffer: audioBuffer };

      const finishLoading = async (trackWithMetadata: Track) => {
        if (!trackWithMetadata.bpm) {
          try {
            setLoadingStates(prev => ({ ...prev, [deckId]: 'Analysiere BPM...' }));
            const bpm = await analyzeBpm(trackWithMetadata.audioBuffer!);
            trackWithMetadata.bpm = bpm;
          } catch (err) {
            console.error('BPM-Analyse fehlgeschlagen:', err);
          }
        }

        if (trackWithMetadata.bpm) {
          try {
            setLoadingStates(prev => ({ ...prev, [deckId]: 'Erstelle Beat-Grid...' }));
            const beatGrid = await getAccurateBeatGrid(trackWithMetadata.audioBuffer!, Number(trackWithMetadata.bpm));
            trackWithMetadata.beatGrid = beatGrid;
          } catch (err) {
            console.error('Beat-Grid-Analyse fehlgeschlagen:', err);
          }
        }

        dispatch({ type: 'LOAD_TRACK', payload: trackWithMetadata });
        setLoadingStates(prev => ({ ...prev, [deckId]: null }));
      };

      jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          const trackWithMetadata = { ...trackForAnalysis };
          const tags = tag.tags;
          trackWithMetadata.name = tags.title || file.name;
          trackWithMetadata.artist = tags.artist;
          if (tags.TBP?.data) {
            trackWithMetadata.bpm = tags.TBP.data;
          }
          finishLoading(trackWithMetadata);
        },
        onError: (error: any) => {
          console.warn('Metadaten konnten nicht gelesen werden. Fahre mit Analyse fort.', error);
          finishLoading(trackForAnalysis);
        },
      });
    },
    [audioContext, library]
  );

  const handleFetchAiTip = async () => {
    setIsLoadingTip(true);
    setAiTip('');
    try {
      const tip = await getDjTip();
      setAiTip(tip);
    } catch (error) {
      console.error('Failed to get AI tip:', error);
      setAiTip('Could not fetch a tip. Please check your API key and connection.');
    } finally {
      setIsLoadingTip(false);
    }
  };

  const handleToggleSync = (deckIdToSync: DeckId) => {
    const dispatch = deckIdToSync === 'A' ? dispatchA : dispatchB;
    const syncToDeckId = deckIdToSync === 'A' ? 'B' : 'A';

    const masterDeck = syncToDeckId === 'A' ? deckAState : deckBState;
    const slaveDeck = deckIdToSync === 'A' ? deckAState : deckBState;
    const slaveAudio = deckIdToSync === 'A' ? audioA.current : audioB.current;
    const syncTimeoutRef = deckIdToSync === 'A' ? syncTimeoutRefA : syncTimeoutRefB;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    if (slaveAudio) slaveAudio.playbackRate = slaveDeck.playbackRate;

    if (slaveDeck.syncedTo !== syncToDeckId) {
      if (
        masterDeck.track?.beatGrid &&
        masterDeck.track.beatGrid.length > 0 &&
        slaveAudio &&
        slaveDeck.track?.beatGrid
      ) {
        const masterAudio = syncToDeckId === 'A' ? audioA.current : audioB.current;
        if (!masterAudio || masterAudio.paused) return;

        const masterCurrentTime = masterAudio.currentTime;
        const slaveCurrentTime = slaveAudio.currentTime;

        const nextMasterBeat = masterDeck.track.beatGrid.find((beat: number) => beat >= masterCurrentTime);
        if (nextMasterBeat === undefined) return;

        const nextSlaveBeat = slaveDeck.track.beatGrid.find((beat: number) => beat >= slaveCurrentTime);
        if (nextSlaveBeat === undefined) return;

        const timeDifference = nextMasterBeat - nextSlaveBeat;

        if (Math.abs(timeDifference) > 0.02) {
          const correctionDuration = 0.5;
          const temporaryPlaybackRateAdjustment = timeDifference / correctionDuration;
          const basePlaybackRate = slaveDeck.playbackRate;
          const temporaryRate = basePlaybackRate + temporaryPlaybackRateAdjustment;

          slaveAudio.playbackRate = temporaryRate;

          syncTimeoutRef.current = window.setTimeout(() => {
            if (slaveAudio) slaveAudio.playbackRate = basePlaybackRate;
            syncTimeoutRef.current = null;
          }, correctionDuration * 1000);
        }
      }
    }

    dispatch({ type: 'TOGGLE_SYNC', payload: { syncToDeckId } });
  };

  useEffect(() => {
    const checkAndSync = (master: DeckState, slave: DeckState, slaveDispatch: React.Dispatch<Action>) => {
      if (slave.syncedTo === master.id && master.track?.bpm && slave.track?.bpm) {
        const masterBpm = Number(master.track.bpm) * master.playbackRate;
        const currentSlaveBpm = Number(slave.track.bpm) * slave.playbackRate;
        if (Math.abs(masterBpm - currentSlaveBpm) > 0.01) {
          slaveDispatch({ type: 'SYNC_BPM', payload: { targetBpm: masterBpm } });
        }
      }
    };
    checkAndSync(deckBState, deckAState, dispatchA);
    checkAndSync(deckAState, deckBState, dispatchB);
  }, [
    deckAState.playbackRate,
    deckAState.syncedTo,
    deckBState.playbackRate,
    deckBState.syncedTo,
    deckAState.track,
    deckBState.track,
  ]);

  useEffect(() => {
    if (!lastMessage) return;
    const midiAction = findActionForMidiMessage(lastMessage);
    if (!midiAction) return;
    const { action, deckId, value } = midiAction;

    if (deckId) {
      const dispatch = deckId === 'A' ? dispatchA : dispatchB;
      switch (action) {
        case 'TOGGLE_PLAY':
          dispatch({ type: 'TOGGLE_PLAY' });
          break;
        case 'SET_CUE':
          const audioRef = deckId === 'A' ? audioA : audioB;
          if (audioRef.current && !audioRef.current.paused) {
            dispatch({ type: 'SET_CUE', payload: audioRef.current.currentTime });
          }
          break;
        case 'JUMP_TO_CUE':
          dispatch({ type: 'JUMP_TO_CUE' });
          break;
        case 'SET_VOLUME':
          dispatch({ type: 'SET_VOLUME', payload: Math.round((value / 127) * 100) });
          break;
        case 'SET_LOW':
          dispatch({ type: 'SET_LOW', payload: Math.round((value / 127) * 100) });
          break;
        case 'SET_MID':
          dispatch({ type: 'SET_MID', payload: Math.round((value / 127) * 100) });
          break;
        case 'SET_HIGH':
          dispatch({ type: 'SET_HIGH', payload: Math.round((value / 127) * 100) });
          break;
        case 'SET_FILTER':
          dispatch({ type: 'SET_FILTER', payload: Math.round((value / 127) * 100) });
          break;
        case 'JOG_WHEEL':
          const jogAudioRef = deckId === 'A' ? audioA : audioB;
          if (jogAudioRef.current) {
            const direction = value === 1 ? 1 : -1;
            jogAudioRef.current.currentTime = Math.max(0, jogAudioRef.current.currentTime + direction * 0.1);
          }
          break;
      }
    } else if (action === 'SET_CROSSFADER') {
      setCrossfader(Math.round((value / 127) * 100));
    }
  }, [lastMessage]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-7xl bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-4">
        <header className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <img src={RobbyLogo} alt="Robby the Robb Logo" className="h-12 w-12" />
            <h1 className="text-2xl font-bold text-white tracking-wider">
              Robby the Robb <span className="text-cyan-400">DJ APP</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <AITip onGetTip={handleFetchAiTip} tip={aiTip} isLoading={isLoadingTip} />
            <MidiIndicator deviceName={midiDeviceName} />
          </div>
        </header>

        <main className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <Deck
              onToggleSync={() => handleToggleSync('A')}
              audioContext={audioContext}
              deckState={deckAState}
              dispatch={dispatchA}
              audioRef={audioA}
              crossfader={crossfader}
              onLoadTrack={(file) => handleLoadTrack('A', file)}
              loadingMessage={loadingStates.A}
            />
          </div>
          <div className="col-span-1">
            <Mixer
              deckAState={deckAState}
              dispatchA={dispatchA}
              deckBState={deckBState}
              dispatchB={dispatchB}
              crossfader={crossfader}
              setCrossfader={setCrossfader}
            />
          </div>
          <div className="col-span-2">
            <Deck
              onToggleSync={() => handleToggleSync('B')}
              audioContext={audioContext}
              deckState={deckBState}
              dispatch={dispatchB}
              audioRef={audioB}
              crossfader={crossfader}
              onLoadTrack={(file) => handleLoadTrack('B', file)}
              loadingMessage={loadingStates.B}
            />
          </div>
        </main>
      </div>

      <FileExplorer library={library} onFilesAdded={handleFilesAdded} onLoadTrack={handleLoadTrack} />

      <footer className="text-center mt-4 text-gray-500 text-xs">
        <p>Conceptual MIDI mapping for Traktor Kontrol S4 MK3. Edit <code>services/midiMap.ts</code> to match your device.</p>
        <p>This is a tech demo and not for professional use.</p>
      </footer>
    </div>
  );
};

export default App;
