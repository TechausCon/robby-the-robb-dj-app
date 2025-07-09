import React, { useRef } from 'react';
import { UploadCloudIcon } from 'lucide-react';

interface MidiSettingsProps {
  onMappingLoad: (file: File) => void;
  mappingName: string | null;
}

export const MidiSettings: React.FC<MidiSettingsProps> = ({ onMappingLoad, mappingName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onMappingLoad(file);
    }
    // Leert das Input-Feld, damit dieselbe Datei erneut ausgewählt werden kann
    event.target.value = '';
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />
      <button
        onClick={handleUploadClick}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-gray-700/50 border-gray-600 hover:bg-gray-700 hover:border-gray-500 text-gray-300 transition-colors"
        title="Load a custom MIDI mapping file (.json)"
      >
        <UploadCloudIcon size={14} />
        <span>{mappingName ? `Map: ${mappingName}` : 'Load Mapping'}</span>
      </button>
    </div>
  );
};
