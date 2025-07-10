import React, { useEffect, useCallback, useState } from 'react';
import { DeckId } from '../../types';

interface KeyboardShortcuts {
  onTogglePlay: (deckId: DeckId) => void;
  onSetCue: (deckId: DeckId) => void;
  onJumpToCue: (deckId: DeckId) => void;
  onToggleSync: (deckId: DeckId) => void;
  onLoadTrack?: (deckId: DeckId) => void;
  onToggleLoop?: (deckId: DeckId) => void;
  onSetHotCue?: (deckId: DeckId, index: number) => void;
  onJumpToHotCue?: (deckId: DeckId, index: number) => void;
  onShowHelp?: () => void;
}

const KEYBOARD_MAP = {
  // Deck A Controls
  'q': { action: 'togglePlay', deck: 'A' },
  'w': { action: 'setCue', deck: 'A' },
  'e': { action: 'jumpToCue', deck: 'A' },
  'r': { action: 'toggleSync', deck: 'A' },
  't': { action: 'toggleLoop', deck: 'A' },
  
  // Deck B Controls
  'u': { action: 'togglePlay', deck: 'B' },
  'i': { action: 'setCue', deck: 'B' },
  'o': { action: 'jumpToCue', deck: 'B' },
  'p': { action: 'toggleSync', deck: 'B' },
  '[': { action: 'toggleLoop', deck: 'B' },
  
  // Hot Cues Deck A (1-8)
  '1': { action: 'hotCue', deck: 'A', index: 0 },
  '2': { action: 'hotCue', deck: 'A', index: 1 },
  '3': { action: 'hotCue', deck: 'A', index: 2 },
  '4': { action: 'hotCue', deck: 'A', index: 3 },
  '5': { action: 'hotCue', deck: 'A', index: 4 },
  '6': { action: 'hotCue', deck: 'A', index: 5 },
  '7': { action: 'hotCue', deck: 'A', index: 6 },
  '8': { action: 'hotCue', deck: 'A', index: 7 },
  
  // Global Controls
  ' ': { action: 'togglePlayFocused' }, // Space bar
  'Escape': { action: 'stopAll' },
  '?': { action: 'showHelp' },
} as const;

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  const [focusedDeck, setFocusedDeck] = useState<DeckId>('A');
  
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    const key = event.key.toLowerCase();
    const mapping = KEYBOARD_MAP[key as keyof typeof KEYBOARD_MAP];
    
    if (!mapping) return;
    
    event.preventDefault();
    
    switch (mapping.action) {
      case 'togglePlay':
        shortcuts.onTogglePlay(mapping.deck as DeckId);
        setFocusedDeck(mapping.deck as DeckId);
        break;
        
      case 'setCue':
        shortcuts.onSetCue(mapping.deck as DeckId);
        break;
        
      case 'jumpToCue':
        shortcuts.onJumpToCue(mapping.deck as DeckId);
        break;
        
      case 'toggleSync':
        shortcuts.onToggleSync(mapping.deck as DeckId);
        break;
        
      case 'toggleLoop':
        if (shortcuts.onToggleLoop) {
          shortcuts.onToggleLoop(mapping.deck as DeckId);
        }
        break;
        
      case 'hotCue':
        if (event.shiftKey && shortcuts.onSetHotCue) {
          // Shift + Number = Set hot cue
          shortcuts.onSetHotCue(mapping.deck as DeckId, mapping.index!);
        } else if (shortcuts.onJumpToHotCue) {
          // Number = Jump to hot cue
          shortcuts.onJumpToHotCue(mapping.deck as DeckId, mapping.index!);
        }
        break;
        
      case 'togglePlayFocused':
        shortcuts.onTogglePlay(focusedDeck);
        break;
        
      case 'showHelp':
        if (shortcuts.onShowHelp) {
          shortcuts.onShowHelp();
        }
        break;
    }
  }, [shortcuts, focusedDeck]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  return { focusedDeck };
};

// Keyboard shortcuts help component
export const KeyboardHelp: React.FC<{ isVisible: boolean; onClose: () => void }> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-bold text-blue-400 mb-3">Deck A</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Play/Pause</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">Q</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Set Cue</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">W</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Jump to Cue</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">E</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sync</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">R</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Loop</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">T</kbd>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-orange-400 mb-3">Deck B</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Play/Pause</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">U</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Set Cue</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">I</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Jump to Cue</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">O</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sync</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">P</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Loop</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">[</kbd>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400 mb-3">Hot Cues</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Jump to Hot Cue (Deck A)</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">1-8</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Set Hot Cue (Deck A)</span>
              <div className="flex items-center space-x-1">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">Shift</kbd>
                <span className="text-gray-500">+</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">1-8</kbd>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-bold text-purple-400 mb-3">Global</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Play/Pause Focused Deck</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">Space</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Show This Help</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">?</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};