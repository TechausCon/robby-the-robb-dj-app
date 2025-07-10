import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Deck } from './components/Deck/Deck';
import { Mixer } from './components/Mixer/Mixer';
import { MidiIndicator } from './components/MidiIndicator';
import { AITip } from './components/AITip';
import { FileExplorer } from './components/FileExplorer';
import { MidiSettings } from './components/MidiSettings';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { KeyboardHelp, useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMidi } from './hooks/useMidi';
import type { DeckState, Action, DeckId, Track, MidiMapping } from '../types';
import { deckReducer } from './reducers/deckReducer';
import { findActionForMidiMessage } from './services/midiMap';
import { getDjTip } from './services/geminiService';
import analyzeBpm from 'bpm-detective';
import jsmediatags from 'jsmediatags';
import RobbyLogo from '../assets/robby-logo.png';

const arrayBufferToBase64 = (buffer: Uint8Array) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

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

const HOT_CUE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

const initializeHotCues = () => {
  return HOT_CUE_COLORS.map(color => ({ position: null, color }));
};

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
  hotCues: initializeHotCues(),
  loop: {
    isActive: false,
    startTime: null,
    endTime: null,
    length: 4
  }
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
  const [library, setLibrary] = useState<Track[]>([]);
  const [activeMapping, setActiveMapping] = useState<MidiMapping | null>(null);
  const [mappingName, setMappingName] = useState<string | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const audioA = useRef<HTMLAudioElement>(null);
  const audioB = useRef<HTMLAudioElement>(null);
  const syncTimeoutRefA = useRef<number | null>(null);
  const syncTimeoutRefB = useRef<number | null>(null);
  const animationFrameIdA = useRef<number | null>(null);
  const animationFrameIdB = useRef<number | null>(null);

  const { lastMessage, midiDeviceName, detectedMapping } = useMidi();

  // Make audioContext available globally for PerformanceMonitor
  useEffect(() => {
    if (audioContext) {
      (window as any).audioContext = audioContext;
    }
  }, [audioContext]);

  useEffect(() => {
    if (detectedMapping) {
      setActiveMapping(detectedMapping.mapping);
      setMappingName(detectedMapping.name);
    }
  }, [detectedMapping]);
  // Keyboard shortcut handlers
  const handleSetCue = useCallback((deckId: DeckId) => {
    const audioRef = deckId === 'A' ? audioA : audioB;
    const dispatch = deckId === 'A' ? dispatchA : dispatchB;
    if (audioRef.current && !audioRef.current.paused) {
      dispatch({ type: 'SET_CUE', payload: audioRef.current.currentTime });
    }
  }, []);

  const handleJumpToCue = useCallback((deckId: DeckId) => {
    const dispatch = deckId === 'A' ? dispatchA : dispatchB;
    dispatch({ type: 'JUMP_TO_CUE' });
  }, []);

  const handleToggleLoop = useCallback((deckId: DeckId) => {
    const dispatch = deckId === 'A' ? dispatchA : dispatchB;
    dispatch({ type: 'TOGGLE_LOOP' });
  }, []);

  const handleSetHotCue = useCallback((deckId: DeckId, index: number) => {
    const audioRef = deckId === 'A' ? audioA : audioB;
    const dispatch = deckId === 'A' ? dispatchA : dispatchB;
    if (audioRef.current) {
      dispatch({ type: 'SET_HOT_CUE', payload: { index, position: audioRef.current.currentTime } });
    }
  }, []);

  const handleJumpToHotCue = useCallback((deckId: DeckId, index: number) => {
    const audioRef = deckId === 'A' ? audioA : audioB;
    const deckState = deckId === 'A' ? deckAState : deckBState;
    const dispatch = deckId === 'A' ? dispatchA : dispatchB;
    
    const cue = deckState.hotCues[index];
    if (cue.position !== null && audioRef.current) {
      audioRef.current.currentTime = cue.position;
      if (!deckState.isPlaying) {
        dispatch({ type: 'TOGGLE_PLAY' });
      }
    }
  }, [deckAState, deckBState]);

  const handleTogglePlay = useCallback(async (deckId: DeckId) => {
    if (!audioContext) {
      console.error("AudioContext nicht initialisiert.");
      return;
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    const dispatch = deckId === 'A' ? dispatchA : dispatchB;
    dispatch({ type: 'TOGGLE_PLAY' });
  }, [audioContext]);

  const handleToggleSync = useCallback((deckIdToSync: DeckId) => {
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
  }, [deckAState, deckBState]);

  // Use keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlay: handleTogglePlay,
    onSetCue: handleSetCue,
    onJumpToCue: handleJumpToCue,
    onToggleSync: handleToggleSync,
    onToggleLoop: handleToggleLoop,
    onSetHotCue: handleSetHotCue,
    onJumpToHotCue: handleJumpToHotCue,
    onShowHelp: () => setShowKeyboardHelp(true),
  });

  const handleFilesAdded = useCallback(async (files: FileList) => {
    let currentAudioContext = audioContext;
    if (!currentAudioContext) {
      try {
        currentAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(currentAudioContext);
      } catch (e) {
        console.error('Web Audio API is not supported in this browser.', e);
        return;
      }
    }

    const newTracks: Track[] = [];
    for (const file of Array.from(files)) {
      const trackId = `${file.name}-${file.size}`;
      if (library.some(track => track.id === trackId)) continue;

      const url = URL.createObjectURL(file);
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer.slice(0));

      const track: Partial<Track> = {
        id: trackId,
        name: file.name.replace(/\.[^/.]+$/, ""),
        url: url,
        duration: audioBuffer.duration,
        audioBuffer: audioBuffer,
      };

      try {
        const tags = await new Promise((resolve, reject) => {
          jsmediatags.read(file, { onSuccess: resolve, onError: reject });
        });
        
        const meta = (tags as any).tags;
        track.name = meta.title || track.name;
        track.artist = meta.artist;
        track.album = meta.album;
        track.year = meta.year;
        track.genre = meta.genre;
        if (meta.TKEY?.data) track.initialKey = meta.TKEY.data;
        if (meta.TBP?.data) track.bpm = parseFloat(meta.TBP.data);

        if (meta.picture) {
          const { data, format } = meta.picture;
          const base64String = arrayBufferToBase64(data);
          track.coverArt = `data:${format};base64,${base64String}`;
        }
      } catch (error) {
        console.warn('Metadaten konnten nicht gelesen werden:', error);
      }
      
      if (!track.bpm) {
        try {
          track.bpm = await analyzeBpm(audioBuffer);
        } catch (err) {
          console.error('BPM-Analyse fehlgeschlagen:', err);
        }
      }
      
      newTracks.push(track as Track);
    }
    
    setLibrary(prev => [...prev, ...newTracks].sort((a, b) => a.name.localeCompare(b.name)));
  }, [audioContext, library]);

  const loadTrackToDeck = useCallback(async (deckId: DeckId, track: Track) => {
    const dispatch = deckId === 'A' ? dispatchA : dispatchB;
    let trackToLoad = { ...track };

    if (trackToLoad.audioBuffer && !trackToLoad.beatGrid) {
      setLoadingStates(prev => ({ ...prev, [deckId]: 'Erstelle Beat-Grid...' }));
      try {
        if (trackToLoad.bpm) {
          const beatGrid = await getAccurateBeatGrid(trackToLoad.audioBuffer, trackToLoad.bpm);
          trackToLoad.beatGrid = beatGrid;
        }
      } catch (err) {
        console.error('Beat-Grid-Analyse fehlgeschlagen:', err);
      }
    }
    
    dispatch({ type: 'LOAD_TRACK', payload: trackToLoad });
    setLoadingStates(prev => ({ ...prev, [deckId]: null }));
  }, []);

  const handleMappingLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const mappingContent = event.target?.result;
        if (typeof mappingContent === 'string') {
          const loadedFile = JSON.parse(mappingContent);
          if (loadedFile && loadedFile.mapping && typeof loadedFile.mapping === 'object') {
            setActiveMapping(loadedFile.mapping);
            setMappingName(loadedFile.name || file.name);
            console.log('MIDI Mapping erfolgreich geladen:', file.name);
          } else {
            throw new Error("Invalid mapping file structure.");
          }
        }
      } catch (e) {
        console.error("Fehler beim Parsen der MIDI-Mapping-Datei:", e);
        alert("Ungültige Mapping-Datei. Bitte stelle sicher, dass es eine valide JSON-Datei mit einem 'name' und 'mapping' Feld ist.");
      }
    };
    reader.readAsText(file);
  };

  const handleFetchAiTip = useCallback(async () => {
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
  }, []);
  useEffect(() => {
    const manageDeck = (
      deckState: DeckState,
      audioRef: React.RefObject<HTMLAudioElement | null>,
      dispatch: React.Dispatch<Action>,
      animationFrameIdRef: React.MutableRefObject<number | null>
    ) => {
      const audio = audioRef.current;
      if (!audio) return;

      const animate = () => {
        if (audio.duration && !audio.paused) {
          dispatch({ type: 'SET_PROGRESS', payload: (audio.currentTime / audio.duration) * 100 });
          animationFrameIdRef.current = requestAnimationFrame(animate);
        }
      };

      if (deckState.isPlaying) {
        audio.play().then(() => {
          animate();
        }).catch(e => {
          console.error(`Playback failed for deck ${deckState.id}`, e);
        });
      } else {
        audio.pause();
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
      }
    };

    manageDeck(deckAState, audioA, dispatchA, animationFrameIdA);
    manageDeck(deckBState, audioB, dispatchB, animationFrameIdB);

    return () => {
      if (animationFrameIdA.current) cancelAnimationFrame(animationFrameIdA.current);
      if (animationFrameIdB.current) cancelAnimationFrame(animationFrameIdB.current);
    };
  }, [deckAState.isPlaying, deckBState.isPlaying, audioContext]);

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
    const midiAction = findActionForMidiMessage(lastMessage, activeMapping);
    if (!midiAction) return;
    const { action, deckId, value } = midiAction;

    if (deckId) {
      const dispatch = deckId === 'A' ? dispatchA : dispatchB;
      switch (action) {
        case 'TOGGLE_PLAY':
          handleTogglePlay(deckId);
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
  }, [lastMessage, handleTogglePlay, activeMapping]);
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
            <MidiSettings onMappingLoad={handleMappingLoad} mappingName={mappingName} activeMapping={activeMapping} />
            <MidiIndicator deviceName={midiDeviceName} />
          </div>
        </header>

        <main className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <Deck
              onToggleSync={() => handleToggleSync('A')}
              onTogglePlay={() => handleTogglePlay('A')}
              audioContext={audioContext}
              deckState={deckAState}
              dispatch={dispatchA}
              audioRef={audioA}
              crossfader={crossfader}
              onLoadTrack={(file) => { /* Handled by FileExplorer now */ }}
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
              onTogglePlay={() => handleTogglePlay('B')}
              audioContext={audioContext}
              deckState={deckBState}
              dispatch={dispatchB}
              audioRef={audioB}
              crossfader={crossfader}
              onLoadTrack={(file) => { /* Handled by FileExplorer now */ }}
              loadingMessage={loadingStates.B}
            />
          </div>
        </main>
      </div>

      <FileExplorer library={library} onFilesAdded={handleFilesAdded} onLoadTrack={loadTrackToDeck} />

      <footer className="text-center mt-4 text-gray-500 text-xs">
        <p>Conceptual MIDI mapping for Traktor Kontrol S4 MK3. Edit <code>services/midiMap.ts</code> to match your device.</p>
        <p>This is a tech demo and not for professional use. Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">?</kbd> for keyboard shortcuts.</p>
      </footer>

      <PerformanceMonitor />
      <KeyboardHelp isVisible={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
    </div>
  );
};

export default App;