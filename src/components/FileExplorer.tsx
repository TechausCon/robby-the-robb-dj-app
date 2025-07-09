import React, { useRef } from 'react';
import { MusicIcon, FolderPlusIcon } from 'lucide-react';
import type { DeckId, Track } from '../types';

interface FileExplorerProps {
  library: File[];
  onFilesAdded: (files: FileList) => void;
  onLoadTrack: (deckId: DeckId, file: File) => void;
}

export const FileExplorer = ({ library, onFilesAdded, onLoadTrack }: FileExplorerProps): JSX.Element => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesAdded(e.target.files);
    }
  };

  return (
    <div className="w-full max-w-7xl bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-4 mt-4">
      <h2 className="text-xl font-bold text-white mb-4">Musikbibliothek</h2>
      
      <div className="flex space-x-4 mb-4">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-blue-600/50 text-blue-200 py-2 rounded-lg hover:bg-blue-600/80 transition-colors flex items-center justify-center space-x-2">
          <MusicIcon size={18} />
          <span>Dateien hinzufügen</span>
        </button>
        <button 
          onClick={() => folderInputRef.current?.click()}
          className="flex-1 bg-green-600/50 text-green-200 py-2 rounded-lg hover:bg-green-600/80 transition-colors flex items-center justify-center space-x-2">
          <FolderPlusIcon size={18} />
          <span>Ordner hinzufügen</span>
        </button>
        <input type="file" multiple accept="audio/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <input type="file" webkitdirectory directory ref={folderInputRef} onChange={handleFileChange} className="hidden" />
      </div>

      <div className="max-h-48 overflow-y-auto bg-gray-900/50 rounded-lg p-2">
        {library.length === 0 && <p className="text-center text-gray-500">Keine Dateien in der Bibliothek.</p>}
        <ul>
          {library.map((file, index) => (
            <li key={index} className="flex justify-between items-center p-2 hover:bg-gray-700/50 rounded-md">
              <span className="text-sm truncate">{file.name}</span>
              <div className="flex space-x-2">
                <button onClick={() => onLoadTrack('A', file)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-400">A</button>
                <button onClick={() => onLoadTrack('B', file)} className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-400">B</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
