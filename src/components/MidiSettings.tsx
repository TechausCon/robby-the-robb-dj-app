import React, { useRef } from 'react';
import { UploadCloudIcon, DownloadIcon } from 'lucide-react';
import type { MidiMapping } from '../../types';

interface MidiSettingsProps {
  onMappingLoad: (file: File) => void;
  mappingName: string | null;
  activeMapping: MidiMapping | null;
  setActiveMapping?: (mapping: MidiMapping) => void; // Optional für Wizard-Integration
  detectedDeviceName?: string | null;
  detectedMapping?: { name: string } | null;
}

export const MidiSettings: React.FC<MidiSettingsProps> = ({
  onMappingLoad,
  mappingName,
  activeMapping,
  setActiveMapping, // für Mapping-Wizard
  detectedDeviceName,
  detectedMapping,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onMappingLoad(file);
    }
    event.target.value = '';
  };

  const handleSaveMapping = () => {
    if (!activeMapping) {
      alert("Kein aktives Mapping zum Speichern vorhanden.");
      return;
    }
    const mappingToSave = {
      name: mappingName || "Custom Mapping",
      mapping: activeMapping,
    };
    const blob = new Blob([JSON.stringify(mappingToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(mappingName || 'custom-mapping').replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      <button
        onClick={handleSaveMapping}
        disabled={!activeMapping}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-gray-700/50 border-gray-600 hover:bg-gray-700 hover:border-gray-500 text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Save current MIDI mapping"
      >
        <DownloadIcon size={14} />
      </button>

      {/* Optional: Zeige Gerät & Mapping-Info, falls Props gesetzt */}
      {detectedDeviceName && (
        <span className="ml-2 text-xs text-gray-400">Gerät: {detectedDeviceName}</span>
      )}
      {detectedMapping?.name && (
        <span className="ml-2 text-xs text-gray-400">Preset: {detectedMapping.name}</span>
      )}
      {/* Optional: Wizard-Button, falls setActiveMapping übergeben */}
      {setActiveMapping && (
        <button
          className="ml-2 px-2 py-1 text-xs rounded bg-cyan-700 hover:bg-cyan-600 text-white"
          onClick={() => {
            // Öffne Mapping-Wizard-Modal, oder baue dein Mapping direkt hier!
            alert('Wizard wäre hier!');
            // setActiveMapping(...); // Wizard ruft dann setActiveMapping(newMapping)
          }}
        >
          Mapping Wizard
        </button>
      )}
    </div>
  );
};
