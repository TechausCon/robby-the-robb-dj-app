export type DeckId = 'A' | 'B';

export interface Track {
  name: string;
  url: string;
  artist?: string;
  bpm?: string | number;
  audioBuffer?: AudioBuffer;
  beatGrid?: number[];
}

export interface DeckState {
  id: DeckId;
  volume: number;
  low: number;
  mid: number;
  high: number;
  filter: number;
  isPlaying: boolean;
  track: Track | null;
  progress: number;
  cuePoint: number;
  playbackRate: number;
  syncedTo: DeckId | null;
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
  | { type: 'SET_PLAYBACK_RATE'; payload: number };

export interface MidiMessage {
  command: number;
  channel: number;
  note: number;
  velocity: number;
}
