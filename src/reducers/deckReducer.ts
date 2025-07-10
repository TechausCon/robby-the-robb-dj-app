import { DeckState, Action } from '../../types';

const HOT_CUE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

const initializeHotCues = () => {
  return HOT_CUE_COLORS.map(color => ({ position: null, color }));
};

export const deckReducer = (state: DeckState, action: Action): DeckState => {
  switch (action.type) {
    case 'TOGGLE_PLAY':
      if (!state.track) return state;
      return { ...state, isPlaying: !state.isPlaying };
    
    case 'LOAD_TRACK':
      return { 
        ...state, 
        track: action.payload, 
        isPlaying: false, 
        progress: 0, 
        cuePoint: 0, 
        filter: 50,
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

    case 'SET_CUE':
      return { ...state, cuePoint: action.payload };
    
    case 'JUMP_TO_CUE':
      return { ...state, isPlaying: false };
    
    case 'SYNC_BPM': {
      if (!state.track?.bpm) return state;
      const originalBpm = state.track.bpm;
      if (originalBpm === 0) return state;
      const newPlaybackRate = action.payload.targetBpm / originalBpm;
      return { ...state, playbackRate: newPlaybackRate };
    }
    
    case 'TOGGLE_SYNC': {
      const newSyncTarget = state.syncedTo === action.payload.syncToDeckId ? null : action.payload.syncToDeckId;
      return { ...state, syncedTo: newSyncTarget };
    }

    case 'SET_PLAYBACK_RATE': {
      return { ...state, playbackRate: action.payload, syncedTo: null };
    }

    // Hot Cue Actions
    case 'SET_HOT_CUE': {
      const newHotCues = [...state.hotCues];
      newHotCues[action.payload.index] = {
        position: action.payload.position,
        color: HOT_CUE_COLORS[action.payload.index]
      };
      return { ...state, hotCues: newHotCues };
    }

    case 'JUMP_TO_HOT_CUE': {
      // Actual jumping happens in the Deck component
      return state;
    }

    case 'DELETE_HOT_CUE': {
      const updatedHotCues = [...state.hotCues];
      updatedHotCues[action.payload.index] = { 
        position: null, 
        color: HOT_CUE_COLORS[action.payload.index] 
      };
      return { ...state, hotCues: updatedHotCues };
    }

    // Loop Actions
    case 'SET_LOOP': {
      return {
        ...state,
        loop: {
          ...state.loop,
          length: action.payload.length,
          isActive: false // Will be activated by TOGGLE_LOOP
        }
      };
    }

    case 'TOGGLE_LOOP': {
      return {
        ...state,
        loop: {
          ...state.loop,
          isActive: !state.loop.isActive
        }
      };
    }

    case 'EXIT_LOOP': {
      return {
        ...state,
        loop: {
          ...state.loop,
          isActive: false,
          startTime: null,
          endTime: null
        }
      };
    }

    case 'HALVE_LOOP': {
      const newLength = Math.max(0.125, state.loop.length / 2);
      return {
        ...state,
        loop: {
          ...state.loop,
          length: newLength
        }
      };
    }

    case 'DOUBLE_LOOP': {
      const newLength = Math.min(32, state.loop.length * 2);
      return {
        ...state,
        loop: {
          ...state.loop,
          length: newLength
        }
      };
    }
    
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_LOW':
      return { ...state, low: action.payload };
    case 'SET_MID':
      return { ...state, mid: action.payload };
    case 'SET_HIGH':
      return { ...state, high: action.payload };
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };

    default:
      return state;
  }
};