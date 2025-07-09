import { MidiMessage, DeckId } from '../types';

// MIDI Command Constants
const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const CC = 0xB0; // Control Change

interface MidiAction {
  action: string;
  deckId?: DeckId;
  value: number;
}

// IMPORTANT: These are *conceptual* mappings for a Traktor Kontrol S4 MK3.
// You may need to use a MIDI monitor tool to find the exact Note/CC values for your device.
// Channels are 0-indexed in our hook (0-15), which corresponds to MIDI channels 1-16.

const mapping = {
  // --- DECK A ---
  [`${NOTE_ON}-0-35`]: { action: 'TOGGLE_PLAY', deckId: 'A' },
  [`${NOTE_ON}-0-36`]: { action: 'SET_CUE', deckId: 'A' },
  [`${NOTE_OFF}-0-36`]: { action: 'JUMP_TO_CUE', deckId: 'A' },
  [`${CC}-0-9`]: { action: 'SET_VOLUME', deckId: 'A' },
  [`${CC}-0-32`]: { action: 'JOG_WHEEL', deckId: 'A' },
  [`${CC}-0-15`]: { action: 'SET_HIGH', deckId: 'A' },
  [`${CC}-0-16`]: { action: 'SET_MID', deckId: 'A' },
  [`${CC}-0-17`]: { action: 'SET_LOW', deckId: 'A' },
  [`${CC}-0-18`]: { action: 'SET_FILTER', deckId: 'A' },

  // --- DECK B ---
  [`${NOTE_ON}-1-35`]: { action: 'TOGGLE_PLAY', deckId: 'B' },
  [`${NOTE_ON}-1-36`]: { action: 'SET_CUE', deckId: 'B' },
  [`${NOTE_OFF}-1-36`]: { action: 'JUMP_TO_CUE', deckId: 'B' },
  [`${CC}-1-9`]: { action: 'SET_VOLUME', deckId: 'B' },
  [`${CC}-1-32`]: { action: 'JOG_WHEEL', deckId: 'B' },
  [`${CC}-1-15`]: { action: 'SET_HIGH', deckId: 'B' },
  [`${CC}-1-16`]: { action: 'SET_MID', deckId: 'B' },
  [`${CC}-1-17`]: { action: 'SET_LOW', deckId: 'B' },
  [`${CC}-1-18`]: { action: 'SET_FILTER', deckId: 'B' },

  // --- MIXER ---
  [`${CC}-0-8`]: { action: 'SET_CROSSFADER' },
};

export const findActionForMidiMessage = (message: MidiMessage): MidiAction | null => {
  const { command, channel, note, velocity } = message;

  // For Note On with 0 velocity, treat it as Note Off
  const effectiveCommand = command === NOTE_ON && velocity === 0 ? NOTE_OFF : command;

  const key = `${effectiveCommand}-${channel}-${note}`;
  const mapped = mapping[key];

  if (mapped) {
    let value = velocity;
    
    if (mapped.action === 'JOG_WHEEL') {
      value = velocity === 1 ? 1 : -1;
    }

    return { ...mapped, value };
  }
  return null;
};
