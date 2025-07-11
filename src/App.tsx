// src/App.tsx
// const EMPTY_MAPPING: MidiMapping = {}; 
import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { Deck } from './components/Deck/Deck';
import { Mixer } from './components/Mixer/Mixer';
import { MidiIndicator } from './components/MidiIndicator';
import { AITip } from './components/AITip';
import { FileExplorer } from './components/FileExplorer';
import { MidiSettings } from './components/MidiSettings';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { KeyboardHelp, useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMidi } from './hooks/useMidi';
import MidiMappingWizard from './components/MidiMappingWizard'; // <--- NEU!
import type { DeckState, Action, DeckId, Track, MidiMapping } from '../types';
import { deckReducer } from './reducers/deckReducer';
import { findActionForMidiMessage } from './services/midiMap';
import { getDjTip } from './services/geminiService';
import analyzeBpm from 'bpm-detective';
import jsmediatags from 'jsmediatags';
import RobbyLogo from '../assets/robby-logo.png';
import { LogOutIcon, SettingsIcon } from 'lucide-react';
import { getUserSettings, saveUserSettings } from './services/api';
import SettingsPage from './components/SettingsPage';

// --- (Hilfsfunktionen bleiben unverändert) ---
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

const EMPTY_MAPPING: MidiMapping = {}; // <--- FIX


const App = (): React.ReactElement => {
  const [deckAState, dispatchA] = useReducer(deckReducer, initialDeckAState);
  const [deckBState, dispatchB] = useReducer(deckReducer, initialDeckBState);
  const [crossfader, setCrossfader] = useState<number>(50);
  const [aiTip, setAiTip] = useState<string>('');
  const [isLoadingTip, setIsLoadingTip] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<DeckId, string | null>>({ A: null, B: null });
  const [library, setLibrary] = useState<Track[]>([]);
  const [activeMapping, setActiveMapping] = useState<MidiMapping | null>(null);
  const [mappingName, setMappingName] = useState<string | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle');
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ---------- Mapping Wizard/Panel State (NEU) ----------
  const [learnMode, setLearnMode] = useState(false);
  const [showMappingMenu, setShowMappingMenu] = useState(false);
  // ------------------------------------------------------

  const audioA = useRef<HTMLAudioElement>(null);
  const audioB = useRef<HTMLAudioElement>(null);
  const syncTimeoutRefA = useRef<number | null>(null);
  const syncTimeoutRefB = useRef<number | null>(null);
  const animationFrameIdA = useRef<number | null>(null);
  const animationFrameIdB = useRef<number | null>(null);

  // ----------- useMidi jetzt mit aktuellem Mapping! -----------
  const { lastMessage, midiDeviceName, detectedMapping } = useMidi(
    activeMapping ?? EMPTY_MAPPING,  // <-- Fallback! Niemals null!
    dispatchA,
    dispatchB,
    setCrossfader
  );
  // ------------------------------------------------------------

  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContext) {
        const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(newAudioContext);
      }
      window.removeEventListener('click', initAudioContext);
      window.removeEventListener('keydown', initAudioContext);
    };
    window.addEventListener('click', initAudioContext);
    window.addEventListener('keydown', initAudioContext);

    return () => {
      window.removeEventListener('click', initAudioContext);
      window.removeEventListener('keydown', initAudioContext);
    };
  }, [audioContext]);

  useEffect(() => {
    const stored = localStorage.getItem("djapp_midi_mapping");
    if (stored) {
      try {
        setActiveMapping(JSON.parse(stored));
      } catch (e) { }
    }
  }, []);
  useEffect(() => {
    if (activeMapping) {
      localStorage.setItem("djapp_midi_mapping", JSON.stringify(activeMapping));
    }
  }, [activeMapping]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getUserSettings();
        if (settings) {
          if (settings.mixer_settings) {
            const { deckA, deckB, crossfader } = settings.mixer_settings;
            dispatchA({ type: 'SET_MIXER_STATE', payload: deckA });
            dispatchB({ type: 'SET_MIXER_STATE', payload: deckB });
            setCrossfader(crossfader);
          }
          if (settings.midi_mapping) {
            setActiveMapping(settings.midi_mapping);
            setMappingName("Gespeichertes Mapping");
          }
        }
      } catch (error) {
        console.error("Fehler beim Laden der Einstellungen:", error);
      } finally {
        setIsSettingsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleLogout = async () => {
    setSaveStatus('saving');
    try {
      const settingsToSave = {
        mixer_settings: {
          deckA: { volume: deckAState.volume, low: deckAState.low, mid: deckAState.mid, high: deckAState.high, filter: deckAState.filter },
          deckB: { volume: deckBState.volume, low: deckBState.low, mid: deckBState.mid, high: deckBState.high, filter: deckBState.filter },
          crossfader: crossfader,
        },
        midi_mapping: activeMapping,
      };
      await saveUserSettings(settingsToSave);
    } catch (error) {
      console.error("Fehler beim Speichern der Einstellungen beim Logout:", error);
    } finally {
      localStorage.removeItem('authToken');
      navigate('/login');
    }
  };

  useEffect(() => {
    const manageDeck = (
      deckState: DeckState,
      audioRef: React.RefObject<HTMLAudioElement | null>,
      dispatch: React.Dispatch<Action>,
      animationFrameIdRef: React.MutableRefObject<number | null>
    ) => {
      const audio = audioRef.current;
      if (!audio || !deckState.track) return;

      const animate = () => {
        if (audio.duration > 0 && !audio.paused) {
          dispatch({ type: 'SET_PROGRESS', payload: (audio.currentTime / audio.duration) * 100 });
          animationFrameIdRef.current = requestAnimationFrame(animate);
        }
      };

      if (deckState.isPlaying) {
        audio.play().then(() => {
          animate();
        }).catch(e => {
          console.error(`Fehler bei der Wiedergabe von Deck ${deckState.id}:`, e);
          dispatch({ type: 'TOGGLE_PLAY' });
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
  }, [deckAState.isPlaying, deckBState.isPlaying, deckAState.track, deckBState.track]);

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
    deckAState.playbackRate, deckAState.syncedTo,
    deckBState.playbackRate, deckBState.syncedTo,
    deckAState.track, deckBState.track,
  ]);

  useEffect(() => {
    if (!lastMessage || !activeMapping) return;
    const midiAction = findActionForMidiMessage(lastMessage, activeMapping);
    if (!midiAction) return;

    const { action, deckId, value } = midiAction;

    const dispatch = deckId === 'A' ? dispatchA : dispatchB;
    const audioRef = deckId === 'A' ? audioA : audioB;

    switch (action) {
      case 'TOGGLE_PLAY':
        handleTogglePlay(deckId!);
        break;
      case 'SET_CUE':
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
      case 'SET_MID':
      case 'SET_HIGH':
      case 'SET_FILTER':
        dispatch({ type: action, payload: Math.round((value / 127) * 100) });
        break;
      case 'JOG_WHEEL':
        if (audioRef.current) {
          const direction = value === 1 ? 1 : -1;
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + direction * 0.1);
        }
        break;
      case 'SET_CROSSFADER':
        setCrossfader(Math.round((value / 127) * 100));
        break;
    }
  }, [lastMessage, activeMapping]);

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
    if (!audioContext) return;
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
    if (!audioContext) {
      console.error("AudioContext nicht bereit.");
      return;
    }

    for (const file of Array.from(files)) {
      const trackId = `local-${file.name}-${file.size}`;
      if (library.some(track => track.id === trackId)) continue;

      const url = URL.createObjectURL(file);
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const track: Partial<Track> = {
        id: trackId,
        name: file.name.replace(/\.[^/.]+$/, ""),
        url: url,
        duration: audioBuffer.duration,
        audioBuffer: audioBuffer,
      };

      // Metadaten und BPM-Analyse hier...
      // ...

      loadTrackToDeck(deckAState.track ? 'B' : 'A', track as Track);
    }
  }, [audioContext, library, deckAState.track]);

  const loadTrackToDeck = useCallback(async (deckId: DeckId, track: Track) => {
    const dispatch = deckId === 'A' ? dispatchA : dispatchB;
    let trackToLoad = { ...track };

    if (!audioContext) {
      console.error("AudioContext ist nicht bereit, um den Track zu laden.");
      return;
    }

    if (!trackToLoad.audioBuffer && trackToLoad.url) {
      setLoadingStates(prev => ({ ...prev, [deckId]: 'Analysiere Track...' }));
      try {
        const response = await fetch(trackToLoad.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        trackToLoad.audioBuffer = audioBuffer;
        trackToLoad.duration = audioBuffer.duration;
      } catch (err) {
        console.error("Fehler beim Analysieren des Tracks:", err);
        setLoadingStates(prev => ({ ...prev, [deckId]: 'Analyse fehlgeschlagen' }));
        return;
      }
    }

    if (trackToLoad.audioBuffer) {
      if (!trackToLoad.bpm) {
        try {
          setLoadingStates(prev => ({ ...prev, [deckId]: 'Analysiere BPM...' }));
          trackToLoad.bpm = await analyzeBpm(trackToLoad.audioBuffer);
        } catch (err) { console.error('BPM-Analyse fehlgeschlagen:', err); }
      }
      if (trackToLoad.bpm && !trackToLoad.beatGrid) {
        setLoadingStates(prev => ({ ...prev, [deckId]: 'Erstelle Beat-Grid...' }));
        try {
          trackToLoad.beatGrid = await getAccurateBeatGrid(trackToLoad.audioBuffer, trackToLoad.bpm);
        } catch (err) { console.error('Beat-Grid-Analyse fehlgeschlagen:', err); }
      }
    }

    dispatch({ type: 'LOAD_TRACK', payload: trackToLoad });
    setLoadingStates(prev => ({ ...prev, [deckId]: null }));
  }, [audioContext]);

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

  if (isSettingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white text-xl">
        Lade deine Einstellungen...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 flex flex-col items-center justify-center p-4 font-sans select-none">
      {/* ---------- Mapping Wizard Overlay ---------- */}
      <MidiMappingWizard
        learnMode={learnMode}
        setLearnMode={setLearnMode}
        activeMapping={activeMapping ?? EMPTY_MAPPING} // <-- Fallback!
        setActiveMapping={setActiveMapping}
        lastMidiMsg={lastMessage}
        deckOptions={["A", "B"]}
      />
      {/* ---------- Mapping Panel Menü ---------- */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => setShowMappingMenu((s) => !s)}
          className="bg-cyan-700 text-white rounded-full p-4 shadow-xl hover:bg-cyan-600 transition-colors"
          title="MIDI Mapping Menü"
        >
          🎛️
        </button>
        {showMappingMenu && (
          <div className="mt-3 bg-gray-900 border border-cyan-700 rounded-xl shadow-2xl p-4 flex flex-col gap-2 min-w-[200px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-cyan-400 font-bold">Mapping Menü</span>
              <button
                onClick={() => setShowMappingMenu(false)}
                className="text-gray-400 hover:text-red-400 text-xl font-bold"
                title="Schließen"
              >×</button>
            </div>
            <button
              onClick={() => {
                setLearnMode(true);
                setShowMappingMenu(false);
              }}
              className="w-full px-3 py-2 bg-cyan-700 text-white rounded-lg font-semibold hover:bg-cyan-800 transition-colors"
            >
              🧙 MIDI Mapping Wizard starten
            </button>
            <button
              onClick={() => {
                document.querySelector<HTMLInputElement>('#mappingImportInput')?.click();
                setShowMappingMenu(false);
              }}
              className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              ⬆️ Mapping laden
            </button>
            <button
              onClick={() => {
                if (!activeMapping) return;
                const mappingToSave = {
                  name: "Custom Mapping",
                  mapping: activeMapping,
                };
                const blob = new Blob([JSON.stringify(mappingToSave, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `custom-mapping.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setShowMappingMenu(false);
              }}
              className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              disabled={!activeMapping}
            >
              ⬇️ Mapping speichern
            </button>
            <input
              id="mappingImportInput"
              type="file"
              className="hidden"
              accept=".json"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const mappingContent = event.target?.result;
                    if (typeof mappingContent === 'string') {
                      const loadedFile = JSON.parse(mappingContent);
                      if (loadedFile && loadedFile.mapping && typeof loadedFile.mapping === 'object') {
                        setActiveMapping(loadedFile.mapping);
                      } else {
                        throw new Error("Invalid mapping file structure.");
                      }
                    }
                  } catch (e) {
                    alert("Ungültige Mapping-Datei.");
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </div>
        )}
      </div>

      <SettingsPage isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
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
            <MidiSettings
              onMappingLoad={handleMappingLoad}
              mappingName={mappingName}
              activeMapping={activeMapping}
              setActiveMapping={setActiveMapping}
              detectedDeviceName={midiDeviceName}
              detectedMapping={detectedMapping}
            />
            <MidiIndicator deviceName={midiDeviceName} />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full text-gray-300 hover:bg-gray-700 transition-colors"
              title="Einstellungen"
            >
              <SettingsIcon size={18} />
            </button>
            <button
              onClick={handleLogout}
              disabled={saveStatus === 'saving'}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-red-600/20 border-red-500 text-red-300 hover:bg-red-600/40 transition-colors disabled:opacity-50"
              title="Save & Logout"
            >
              {saveStatus === 'saving' ? (
                <span className="animate-spin">💾</span>
              ) : (
                <LogOutIcon size={14} />
              )}
              <span>{saveStatus === 'saving' ? 'Speichern...' : 'Logout'}</span>
            </button>
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
              loadingMessage={loadingStates.B}
            />
          </div>
        </main>
      </div>
      <FileExplorer library={library} onFilesAdded={handleFilesAdded} onLoadTrack={loadTrackToDeck} />
      <footer className="text-center mt-4 text-gray-500 text-xs">
        <p>Drücke <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">?</kbd> für Tastaturkürzel.</p>
      </footer>
      <PerformanceMonitor />
      <KeyboardHelp isVisible={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
    </div>
  );
};

export default App;
