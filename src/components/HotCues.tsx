import React from 'react';
import { DeckId } from '../../../types';

interface HotCue {
  position: number | null;
  color: string;
}

interface HotCuesProps {
  deckId: DeckId;
  hotCues: HotCue[];
  currentTime: number;
  isPlaying: boolean;
  onSetHotCue: (index: number, position: number) => void;
  onJumpToHotCue: (index: number) => void;
  onDeleteHotCue: (index: number) => void;
}

const HOT_CUE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export const HotCues: React.FC<HotCuesProps> = ({
  deckId,
  hotCues,
  currentTime,
  isPlaying,
  onSetHotCue,
  onJumpToHotCue,
  onDeleteHotCue,
}) => {
  const handleCueClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (e.shiftKey) {
      // Shift + Click = Delete hot cue
      onDeleteHotCue(index);
    } else if (hotCues[index].position === null) {
      // Empty slot = Set hot cue at current position
      onSetHotCue(index, currentTime);
    } else {
      // Has position = Jump to hot cue
      onJumpToHotCue(index);
    }
  };

  const handleCueRightClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    // Right click = Delete hot cue
    onDeleteHotCue(index);
  };

  return (
    <div className="grid grid-cols-4 gap-1.5 p-2 bg-gray-900/50 rounded-lg">
      {hotCues.map((cue, index) => {
        const isSet = cue.position !== null;
        const buttonColor = isSet ? cue.color : '#374151'; // gray-700 if not set
        
        return (
          <button
            key={index}
            onClick={(e) => handleCueClick(index, e)}
            onContextMenu={(e) => handleCueRightClick(index, e)}
            className={`
              relative h-10 rounded-md font-bold text-xs
              transition-all duration-150 transform
              ${isSet 
                ? 'shadow-lg hover:scale-105 active:scale-95' 
                : 'hover:bg-gray-600'
              }
            `}
            style={{
              backgroundColor: buttonColor,
              color: isSet ? 'white' : '#9ca3af',
              boxShadow: isSet ? `0 4px 12px ${buttonColor}40` : 'none',
            }}
            title={
              isSet 
                ? `Hot Cue ${index + 1} • Click: Jump • Shift+Click/Right-Click: Delete` 
                : `Set Hot Cue ${index + 1}`
            }
          >
            <span className="absolute top-0.5 left-1 text-[10px] opacity-70">
              {index + 1}
            </span>
            <span className="text-sm">
              {isSet ? 'CUE' : '•'}
            </span>
            {isSet && cue.position !== undefined && (
              <span className="absolute bottom-0.5 right-1 text-[9px] opacity-70 font-mono">
                {formatTime(cue.position)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// Helper function to format time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
};

// Update types.ts to include hot cues:
/*
export interface DeckState {
  // ... existing properties ...
  hotCues: Array<{ position: number | null; color: string }>;
}

// Add to Action type:
| { type: 'SET_HOT_CUE'; payload: { index: number; position: number } }
| { type: 'JUMP_TO_HOT_CUE'; payload: { index: number } }
| { type: 'DELETE_HOT_CUE'; payload: { index: number } }
*/

// Update deckReducer.ts to handle hot cues:
/*
case 'SET_HOT_CUE':
  const newHotCues = [...state.hotCues];
  newHotCues[action.payload.index] = {
    position: action.payload.position,
    color: HOT_CUE_COLORS[action.payload.index]
  };
  return { ...state, hotCues: newHotCues };

case 'JUMP_TO_HOT_CUE':
  // The actual jumping happens in the Deck component
  return state;

case 'DELETE_HOT_CUE':
  const updatedHotCues = [...state.hotCues];
  updatedHotCues[action.payload.index] = { position: null, color: HOT_CUE_COLORS[action.payload.index] };
  return { ...state, hotCues: updatedHotCues };
*/