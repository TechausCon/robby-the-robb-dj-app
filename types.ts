// types.ts

export type DeckId = 'A' | 'B';

// NEU: Definition für ein MIDI-Mapping-Objekt
export interface MidiMapping {
  [key: string]: {
    action: string;
    deckId?: DeckId;
  };
}

export interface Track {
  id: string; 
  name: string;
  url: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  initialKey?: string;
  bpm?: number;
  duration?: number;
  coverArt?: string;
  audioBuffer?: AudioBuffer;
  beatGrid?: number[];
}

// NEU: Ein Typ für die Mixer-Einstellungen, um Wiederholungen zu vermeiden
export type MixerState = {
  volume: number;
  low: number;
  mid: number;
  high: number;
  filter: number;
}

export interface DeckState extends MixerState {
  id: DeckId;
  isPlaying: boolean;
  track: Track | null;
  progress: number;
  cuePoint: number;
  playbackRate: number;
  syncedTo: DeckId | null;
  hotCues: Array<{ position: number | null; color: string }>;
  loop: {
    isActive: boolean;
    startTime: number | null;
    endTime: number | null;
    length: number;
  };
}

export type Action =
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_LOW'; payload: number }
  | { type: 'SET_MID'; payload: number }
  | { type: 'SET_HIGH'; payload: number }
  | { type: 'SET_FILTER'; payload: number }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'LOAD_TRACK'; payload: Track }
  | { type: 'SET_CUE'; payload: number }
  | { type: 'JUMP_TO_CUE' }
  | { type: 'SYNC_BPM'; payload: { targetBpm: number } }
  | { type: 'TOGGLE_SYNC'; payload: { syncToDeckId: DeckId } }
  | { type: 'SET_PLAYBACK_RATE'; payload: number }
  // NEU: Hot Cue Actions
  | { type: 'SET_HOT_CUE'; payload: { index: number; position: number } }
  | { type: 'JUMP_TO_HOT_CUE'; payload: { index: number } }
  | { type: 'DELETE_HOT_CUE'; payload: { index: number } }
  // NEU: Loop Actions
  | { type: 'SET_LOOP'; payload: { length: number } }
  | { type: 'TOGGLE_LOOP' }
  | { type: 'EXIT_LOOP' }
  | { type: 'HALVE_LOOP' }
  | { type: 'DOUBLE_LOOP' }
  // KORREKTUR: Die neue Action zum Setzen des kompletten Mixer-Zustands
  | { type: 'SET_MIXER_STATE'; payload: MixerState };


export interface MidiMessage {
  command: number;
  channel: number;
  note: number;
  velocity: number;
}