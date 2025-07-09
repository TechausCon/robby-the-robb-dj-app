import React, { useRef } from 'react';
import { UploadCloudIcon, Music, Disc, Clock, Hash, Album, Calendar, Tag, KeyRound } from 'lucide-react';

// Annahme der Typ-Definitionen
type DeckId = 'A' | 'B';
interface Track {
  id: string;
  name: string;
  url: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  initialKey?: string;
  bpm?: number;
  duration?: number;
  coverArt?: string;
}

interface FileExplorerProps {
  library: Track[];
  onFilesAdded: (files: FileList) => void;
  onLoadTrack: (deckId: DeckId, track: Track) => void;
}

// Hilfsfunktion zum Formatieren der Zeit
const formatDuration = (seconds: number = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const FileExplorer = ({ library, onFilesAdded, onLoadTrack }: FileExplorerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesAdded(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-7xl bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-4 mt-4">
      <header className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Track Library</h2>
        <input
          type="file"
          multiple
          accept="audio/*, .mp3, .wav, .ogg"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleAddClick}
          className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors shadow-md"
        >
          <UploadCloudIcon size={20} />
          <span>Add Tracks</span>
        </button>
      </header>
      <div className="h-64 overflow-y-auto bg-gray-900/50 rounded-lg border border-gray-700/50">
        {library.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Music size={48} />
            <p className="mt-2 font-semibold">Your library is empty.</p>
            <p className="text-sm">Click "Add Tracks" to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700/60 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-2 py-2 w-14"></th>
                <th scope="col" className="px-4 py-2">Title</th>
                <th scope="col" className="px-4 py-2">Artist</th>
                <th scope="col" className="px-4 py-2">Album</th>
                <th scope="col" className="px-2 py-2 text-center" title="Year"><Calendar size={14} className="inline-block -mt-1"/></th>
                <th scope="col" className="px-4 py-2">Genre</th>
                <th scope="col" className="px-2 py-2 text-center" title="Key"><KeyRound size={14} className="inline-block -mt-1"/></th>
                <th scope="col" className="px-2 py-2 text-center" title="BPM"><Hash size={14} className="inline-block -mt-1"/></th>
                <th scope="col" className="px-2 py-2 text-center" title="Duration"><Clock size={14} className="inline-block -mt-1"/></th>
                <th scope="col" className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {library.map((track) => (
                <tr key={track.id} className="hover:bg-gray-700/50 transition-colors group">
                  <td className="p-2">
                    {track.coverArt ? (
                      <img src={track.coverArt} alt={track.name} className="h-10 w-10 object-cover rounded-md" />
                    ) : (
                      <div className="h-10 w-10 bg-gray-700 rounded-md flex items-center justify-center">
                        <Music size={20} className="text-gray-500" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium text-white truncate max-w-48" title={track.name}>{track.name}</td>
                  <td className="px-4 py-2 text-gray-400 truncate max-w-48" title={track.artist}>{track.artist || '-'}</td>
                  <td className="px-4 py-2 text-gray-400 truncate max-w-48" title={track.album}>{track.album || '-'}</td>
                  <td className="px-2 py-2 text-gray-400 text-center">{track.year || '-'}</td>
                  <td className="px-4 py-2 text-gray-400 truncate max-w-32" title={track.genre}>{track.genre || '-'}</td>
                  <td className="px-2 py-2 text-gray-400 text-center">{track.initialKey || '-'}</td>
                  <td className="px-2 py-2 text-gray-400 text-center">{track.bpm?.toFixed(1) || '-'}</td>
                  <td className="px-2 py-2 text-gray-400 text-center">{formatDuration(track.duration)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onLoadTrack('A', track)}
                        className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                      >
                        Load A
                      </button>
                      <button
                        onClick={() => onLoadTrack('B', track)}
                        className="px-3 py-1 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-md transition-colors"
                      >
                        Load B
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
