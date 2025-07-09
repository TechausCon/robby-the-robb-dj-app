import { MidiMessage, DeckId, MidiMapping } from '../../types';

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;

interface MidiAction {
  action: string;
  deckId?: DeckId;
  value: number;
}

export const findActionForMidiMessage = (message: MidiMessage, activeMapping: MidiMapping | null): MidiAction | null => {
  if (!activeMapping) {
    return null; // Kein Mapping geladen, keine Aktion möglich
  }

  const { command, channel, note, velocity } = message;

  const effectiveCommand = command === NOTE_ON && velocity === 0 ? NOTE_OFF : command;
  const key = `${effectiveCommand}-${channel}-${note}`;
  const mapped = activeMapping[key];

  if (mapped) {
    let value = velocity;
    
    if (mapped.action === 'JOG_WHEEL') {
      value = velocity === 1 ? 1 : -1;
    }

    return { ...mapped, value };
  }
  return null;
};
