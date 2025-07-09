import { useState, useEffect, useRef } from 'react';
import { MidiMessage, MidiMapping } from '../../types';
import { detectMappingForDevice } from '../mappings';

export const useMidi = () => {
  const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<MidiMessage | null>(null);
  const [detectedMapping, setDetectedMapping] = useState<{ name: string; mapping: MidiMapping } | null>(null);
  const midiAccessRef = useRef<MIDIAccess | null>(null);

  const onMIDIMessage = (event: MIDIMessageEvent) => {
    const data = event.data;
    if (data) {
        const [command, note, velocity] = data;
        const channel = command & 0x0f;
        const cmd = command & 0xf0;
        setLastMessage({ command: cmd, channel, note, velocity });
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
      // Versuche, ein Mapping für das verbundene Gerät zu finden
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
  }, []);

  return { midiDeviceName, lastMessage, detectedMapping };
};
