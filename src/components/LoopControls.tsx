import React from 'react';
import { RepeatIcon, XIcon } from 'lucide-react';
import { DeckId } from '../../../types';

interface LoopState {
  isActive: boolean;
  startTime: number | null;
  endTime: number | null;
  length: number; // in beats
}

interface LoopControlsProps {
  deckId: DeckId;
  loopState: LoopState;
  currentTime: number;
  bpm: number | undefined;
  beatGrid: number[] | undefined;
  onSetLoop: (length: number) => void;
  onToggleLoop: () => void;
  onExitLoop: () => void;
  onHalveLoop: () => void;
  onDoubleLoop: () => void;
}

const LOOP_LENGTHS = [
  { beats: 0.125, label: '1/8' },
  { beats: 0.25, label: '1/4' },
  { beats: 0.5, label: '1/2' },
  { beats: 1, label: '1' },
  { beats: 2, label: '2' },
  { beats: 4, label: '4' },
  { beats: 8, label: '8' },
  { beats: 16, label: '16' },
];

export const LoopControls: React.FC<LoopControlsProps> = ({
  deckId,
  loopState,
  currentTime,
  bpm,
  beatGrid,
  onSetLoop,
  onToggleLoop,
  onExitLoop,
  onHalveLoop,
  onDoubleLoop,
}) => {
  const deckColor = deckId === 'A' ? 'blue' : 'orange';
  const activeColor = deckId === 'A' ? 'bg-blue-500' : 'bg-orange-500';
  const hoverColor = deckId === 'A' ? 'hover:bg-blue-600' : 'hover:bg-orange-600';

  return (
    <div className="space-y-2">
      {/* Loop Length Buttons */}
      <div className="grid grid-cols-4 gap-1">
        {LOOP_LENGTHS.map((loop) => {
          const isCurrentLength = loopState.isActive && loopState.length === loop.beats;
          
          return (
            <button
              key={loop.beats}
              onClick={() => onSetLoop(loop.beats)}
              disabled={!bpm || !beatGrid}
              className={`
                py-1.5 px-2 rounded text-xs font-bold
                transition-all duration-150
                ${isCurrentLength 
                  ? `${activeColor} text-white shadow-lg` 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }
                disabled:opacity-30 disabled:cursor-not-allowed
              `}
              title={`Set ${loop.label} beat loop`}
            >
              {loop.label}
            </button>
          );
        })}
      </div>

      {/* Loop Control Buttons */}
      <div className="flex space-x-1">
        <button
          onClick={onHalveLoop}
          disabled={!loopState.isActive || loopState.length <= 0.125}
          className={`
            flex-1 py-2 rounded text-xs font-bold
            bg-gray-700 hover:bg-gray-600 text-gray-300
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          `}
          title="Halve loop length"
        >
          ÷2
        </button>

        <button
          onClick={onToggleLoop}
          disabled={!bpm || !beatGrid}
          className={`
            flex-1 py-2 px-3 rounded text-sm font-bold
            flex items-center justify-center space-x-1
            ${loopState.isActive 
              ? `${activeColor} ${hoverColor} text-white shadow-lg` 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all duration-150
          `}
          title={loopState.isActive ? "Toggle loop" : "Activate loop"}
        >
          <RepeatIcon size={16} />
          <span>LOOP</span>
        </button>

        <button
          onClick={onDoubleLoop}
          disabled={!loopState.isActive || loopState.length >= 32}
          className={`
            flex-1 py-2 rounded text-xs font-bold
            bg-gray-700 hover:bg-gray-600 text-gray-300
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          `}
          title="Double loop length"
        >
          ×2
        </button>

        <button
          onClick={onExitLoop}
          disabled={!loopState.isActive}
          className={`
            p-2 rounded
            bg-gray-700 hover:bg-gray-600 text-gray-300
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          `}
          title="Exit loop"
        >
          <XIcon size={16} />
        </button>
      </div>

      {/* Loop Info Display */}
      {loopState.isActive && (
        <div className="text-xs text-gray-400 text-center font-mono">
          Loop: {loopState.length} {loopState.length === 1 ? 'beat' : 'beats'}
        </div>
      )}
    </div>
  );
};

// Helper function to find nearest beat
export const findNearestBeat = (beatGrid: number[], currentTime: number): number => {
  if (beatGrid.length === 0) return currentTime;
  
  let nearestBeat = beatGrid[0];
  let minDiff = Math.abs(currentTime - beatGrid[0]);
  
  for (const beat of beatGrid) {
    const diff = Math.abs(currentTime - beat);
    if (diff < minDiff) {
      minDiff = diff;
      nearestBeat = beat;
    }
  }
  
  return nearestBeat;
};

// Helper function to calculate loop times
export const calculateLoopTimes = (
  beatGrid: number[], 
  currentTime: number, 
  loopLengthBeats: number
): { start: number; end: number } => {
  const nearestBeatIndex = beatGrid.findIndex(beat => beat >= currentTime);
  if (nearestBeatIndex === -1) {
    return { start: currentTime, end: currentTime + 1 };
  }
  
  const startBeatIndex = Math.max(0, nearestBeatIndex - 1);
  const endBeatIndex = Math.min(beatGrid.length - 1, startBeatIndex + loopLengthBeats);
  
  return {
    start: beatGrid[startBeatIndex],
    end: beatGrid[endBeatIndex] || beatGrid[startBeatIndex] + loopLengthBeats
  };
};

// Update types.ts to include loop state:
/*
export interface DeckState {
  // ... existing properties ...
  loop: {
    isActive: boolean;
    startTime: number | null;
    endTime: number | null;
    length: number;
  };
}

// Add to Action type:
| { type: 'SET_LOOP'; payload: { length: number } }
| { type: 'TOGGLE_LOOP' }
| { type: 'EXIT_LOOP' }
| { type: 'HALVE_LOOP' }
| { type: 'DOUBLE_LOOP' }
*/