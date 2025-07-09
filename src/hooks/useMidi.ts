import { useState, useEffect, useRef } from 'react';
import { MidiMessage } from '../../types';

export const useMidi = () => {
  const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<MidiMessage | null>(null);
  const midiAccessRef = useRef<MIDIAccess | null>(null);

  const onMIDIMessage = (event: MIDIMessageEvent) => {
    const [command, note, velocity] = event.data;
    const channel = command & 0x0f; // Get lower 4 bits for channel
    const cmd = command & 0xf0; // Get higher 4 bits for command
    
    setLastMessage({ command: cmd, channel, note, velocity });
  };

  const updateMidiConnections = (midiAccess: MIDIAccess) => {
    const inputs = Array.from(midiAccess.inputs.values());
    
    // Set up listeners on all inputs
    for (const input of inputs) {
      input.onmidimessage = onMIDIMessage;
    }
    
    // Update the device name displayed. Show the first one, or null if none.
    if (inputs.length > 0) {
      setMidiDeviceName(inputs[0].name || 'Unknown Device');
    } else {
      setMidiDeviceName(null);
    }
  };

  const onMIDISuccess = (midiAccess: MIDIAccess) => {
    midiAccessRef.current = midiAccess;
    updateMidiConnections(midiAccess);

    // When a device is connected or disconnected
    midiAccess.onstatechange = (event: MIDIConnectionEvent) => {
      console.log(`MIDI Port state change: ${event.port.name} (${event.port.state})`);
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
        .then(onMIDISuccess, () => onMIDIFailure('Could not access your MIDI devices. Please ensure you grant permission.'));
    } else {
        onMIDIFailure('WebMIDI is not supported in this browser.');
    }
    
    // Cleanup function
    return () => {
      const midiAccess = midiAccessRef.current;
      if (midiAccess) {
        midiAccess.onstatechange = null;
        midiAccess.inputs.forEach(input => {
          input.onmidimessage = null;
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { midiDeviceName, lastMessage };
};
