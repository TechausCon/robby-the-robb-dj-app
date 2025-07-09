import React from 'react';
import { RssIcon, XCircleIcon } from 'lucide-react';

interface MidiIndicatorProps {
  deviceName: string | null;
}

export const MidiIndicator: React.FC<MidiIndicatorProps> = ({ deviceName }) => {
  const isConnected = !!deviceName;

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
        isConnected
          ? 'bg-green-600/20 border-green-500 text-green-300'
          : 'bg-red-600/20 border-red-500 text-red-300'
      }`}
      title={isConnected ? `Connected to: ${deviceName}` : 'No MIDI device connected'}
    >
      {isConnected ? <RssIcon size={14} /> : <XCircleIcon size={14} />}
      <span className="truncate max-w-32">{deviceName || 'Disconnected'}</span>
    </div>
  );
};
