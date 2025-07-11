import React, { useState, useEffect } from "react";
import type { MidiMessage, MidiMapping, DeckId } from "../../types";

interface MidiMappingWizardProps {
  learnMode: boolean;
  setLearnMode: (active: boolean) => void;
  activeMapping: MidiMapping;
  setActiveMapping: (mapping: MidiMapping) => void;
  lastMidiMsg: MidiMessage | null;
  deckOptions?: DeckId[];
}

const DEFAULT_DECKS: DeckId[] = ["A", "B"];

const actionOptions = [
  { action: "TOGGLE_PLAY", label: "Play/Pause" },
  { action: "SET_CUE", label: "Set Cue" },
  { action: "JUMP_TO_CUE", label: "Jump to Cue" },
  { action: "SET_VOLUME", label: "Volume" },
  { action: "SET_HIGH", label: "High EQ" },
  { action: "SET_MID", label: "Mid EQ" },
  { action: "SET_LOW", label: "Low EQ" },
  { action: "SET_FILTER", label: "Filter" },
  // Add more actions as needed...
];

export default function MidiMappingWizard({
  learnMode,
  setLearnMode,
  activeMapping,
  setActiveMapping,
  lastMidiMsg,
  deckOptions = DEFAULT_DECKS,
}: MidiMappingWizardProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<DeckId>(deckOptions[0]);

  useEffect(() => {
    if (learnMode && lastMidiMsg) {
      const key = `${lastMidiMsg.command}-${lastMidiMsg.channel}-${lastMidiMsg.note}`;
      setPendingKey(key);
    }
  }, [lastMidiMsg, learnMode]);

  function handleAssign(action: string) {
    if (!pendingKey) return;
    const newMapping: MidiMapping = {
      ...activeMapping,
      [pendingKey]: { action, deckId: selectedDeck },
    };
    setActiveMapping(newMapping);
    localStorage.setItem("djapp_midi_mapping", JSON.stringify(newMapping));
    setPendingKey(null);
    setLearnMode(false);
  }

// Removed invalid JSX usage outside of render/return.

  function handleCancel() {
    setPendingKey(null);
    setLearnMode(false);
  }

  return (
    learnMode && pendingKey ? (
      <div className="fixed bottom-8 right-8 bg-neutral-900 p-6 rounded-2xl shadow-2xl text-white z-50 flex flex-col gap-2 min-w-[280px]">
        <div className="mb-1">
          <b>MIDI erkannt:</b> <span className="font-mono">{pendingKey}</span>
        </div>
        <div className="mb-1">
          <span className="mr-2">Deck:</span>
          <select
            value={selectedDeck}
            onChange={e => setSelectedDeck(e.target.value as DeckId)}
            className="bg-gray-800 text-white p-1 rounded border border-gray-600"
          >
            {deckOptions.map(deck => <option key={deck} value={deck}>{deck}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {actionOptions.map(opt => (
            <button
              key={opt.action}
              onClick={() => handleAssign(opt.action)}
              className="px-2 py-1 bg-cyan-700 rounded hover:bg-cyan-600 transition-colors text-xs"
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          className="text-xs mt-4 opacity-70 underline hover:text-red-400"
          onClick={handleCancel}
        >
          Abbrechen
        </button>
      </div>
    ) : null
  );
}
