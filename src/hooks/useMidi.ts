import { useState, useEffect, useRef } from 'react';
import { MidiMessage, MidiMapping } from '../../types';
import { detectMappingForDevice } from '../mappings';
import { findActionForMidiMessage } from '../services/midiMap';

interface UseMidiReturn {
  midiDeviceName: string | null;
  lastMessage: MidiMessage | null;
  detectedMapping: { name: string; mapping: MidiMapping } | null;
}

export const useMidi = (
  activeMapping: MidiMapping,
  dispatchA: React.Dispatch<any>,   // für Deck A
  dispatchB: React.Dispatch<any>,   // für Deck B
  setCrossfader: (val: number) => void, // für Crossfader
): UseMidiReturn => {
  const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<MidiMessage | null>(null);
  const [detectedMapping, setDetectedMapping] = useState<{ name: string; mapping: MidiMapping } | null>(null);
  const midiAccessRef = useRef<MIDIAccess | null>(null);

  // MIDI-Event-Handler
  const onMIDIMessage = (event: MIDIMessageEvent) => {
    const data = event.data;
    if (data) {
      const [command, note, velocity] = data;
      const channel = command & 0x0f;
      const cmd = command & 0xf0;
      const midiMsg = { command: cmd, channel, note, velocity };
      setLastMessage(midiMsg);
// Removed invalid useMidi call and incomplete nullish coalescing operator.
      if (activeMapping) {
        const midiAction = findActionForMidiMessage(midiMsg, activeMapping);
        if (midiAction) {
          const { action, deckId, value } = midiAction;

          // Dispatcher bestimmen
          let dispatch;
          if (deckId === 'A') dispatch = dispatchA;
          else if (deckId === 'B') dispatch = dispatchB;

          switch (action) {
            case 'TOGGLE_PLAY':
              dispatch && dispatch({ type: 'TOGGLE_PLAY' });
              break;
            case 'SET_CUE':
              dispatch && dispatch({ type: 'SET_CUE', payload: undefined }); // payload ggf. im App-Flow setzen
              break;
            case 'JUMP_TO_CUE':
              dispatch && dispatch({ type: 'JUMP_TO_CUE' });
              break;
            case 'SET_VOLUME':
              dispatch && dispatch({ type: 'SET_VOLUME', payload: Math.round((value / 127) * 100) });
              break;
            case 'SET_LOW':
              dispatch && dispatch({ type: 'SET_LOW', payload: Math.round((value / 127) * 100) });
              break;
            case 'SET_MID':
              dispatch && dispatch({ type: 'SET_MID', payload: Math.round((value / 127) * 100) });
              break;
            case 'SET_HIGH':
              dispatch && dispatch({ type: 'SET_HIGH', payload: Math.round((value / 127) * 100) });
              break;
            case 'SET_FILTER':
              dispatch && dispatch({ type: 'SET_FILTER', payload: Math.round((value / 127) * 100) });
              break;
            case 'SET_CROSSFADER':
              setCrossfader && setCrossfader(Math.round((value / 127) * 100));
              break;
            // ...weitere Fälle hier einbauen, wenn du willst!
          }
        }
      }
    }
  };

  const updateMidiConnections = (midiAccess: MIDIAccess) => {
    const inputs = Array.from(midiAccess.inputs.values());
    for (const input of inputs) {
      input.onmidimessage = onMIDIMessage;
    }
    if (inputs.length > 0) {
      const deviceName = inputs[0].name || 'Unknown Device';
      setMidiDeviceName(deviceName);
      const mapping = detectMappingForDevice(deviceName);
      setDetectedMapping(mapping);
      if (mapping) {
        console.log(`Mapping "${mapping.name}" für Gerät "${deviceName}" geladen.`);
      } else {
        console.log(`Kein Standard-Mapping für "${deviceName}" gefunden. Bitte manuell laden.`);
      }
    } else {
      setMidiDeviceName(null);
      setDetectedMapping(null);
    }
  };

  const onMIDISuccess = (midiAccess: MIDIAccess) => {
    midiAccessRef.current = midiAccess;
    updateMidiConnections(midiAccess);

    midiAccess.onstatechange = (event: MIDIConnectionEvent) => {
      if (event.port) {
        console.log(`MIDI Port state change: ${event.port.name} (${event.port.state})`);
      }
      updateMidiConnections(midiAccess);
    };
  };

  const onMIDIFailure = (msg: string) => {
    console.error(`Failed to get MIDI access - ${msg}`);
    setMidiDeviceName(null);
  };

  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess({ sysex: false })
        .then(onMIDISuccess, () => onMIDIFailure('Could not access your MIDI devices.'));
    } else {
      onMIDIFailure('WebMIDI is not supported in this browser.');
    }
    return () => {
      const midiAccess = midiAccessRef.current;
      if (midiAccess) {
        midiAccess.onstatechange = null;
        midiAccess.inputs.forEach(input => {
          input.onmidimessage = null;
        });
      }
    };
  }, [activeMapping, dispatchA, dispatchB, setCrossfader]); // Wichtig: alle neuen Props als Dependency!

  return { midiDeviceName, lastMessage, detectedMapping };
};
