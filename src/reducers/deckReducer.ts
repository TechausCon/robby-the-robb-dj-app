import { DeckState, Action } from '../../types';

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
      };

    case 'SET_CUE':
      return { ...state, cuePoint: action.payload };
    
    case 'JUMP_TO_CUE':
      // Beim Springen zum Cue-Punkt wird die Wiedergabe gestoppt und der Fortschritt auf den Cue-Punkt gesetzt.
      // Das eigentliche Setzen der `currentTime` des Audio-Elements passiert in der Deck-Komponente.
      return { ...state, isPlaying: false };
    
    case 'SYNC_BPM': {
      if (!state.track?.bpm) return state;
      // KORREKTUR: Die Umwandlung zu Number() ist nicht mehr nötig, da der Typ jetzt korrekt ist.
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
      // Wenn die Abspielgeschwindigkeit manuell geändert wird, wird SYNC deaktiviert.
      return { ...state, playbackRate: action.payload, syncedTo: null };
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
