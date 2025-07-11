// src/components/FileExplorer.tsx
import React, { useState, useEffect } from 'react';
import { UploadCloudIcon, Music, HardDrive, Cloud, RefreshCw, AlertTriangle, Folder, ArrowLeft } from 'lucide-react';
import { getNextcloudFiles, downloadNextcloudFile } from '../services/api';

// Typ-Definitionen
type DeckId = 'A' | 'B';
interface Track {
  id: string;
  name: string;
  url: string;
  artist?: string;
  album?: string;
  // ... weitere Track-Eigenschaften
}
interface NextcloudItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    lastModified: string;
}

interface FileExplorerProps {
  library: Track[];
  onFilesAdded: (files: FileList) => void;
  onLoadTrack: (deckId: DeckId, track: Track) => void;
}

export const FileExplorer = ({ library, onFilesAdded, onLoadTrack }: FileExplorerProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'local' | 'nextcloud'>('local');
  
  const [nextcloudItems, setNextcloudItems] = useState<NextcloudItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [ncLoading, setNcLoading] = useState(false);
  const [ncError, setNcError] = useState<string | null>(null);
  const [loadingTrack, setLoadingTrack] = useState<string | null>(null);

  const fetchNcFiles = async (path: string) => {
    setNcLoading(true);
    setNcError(null);
    try {
      const items = await getNextcloudFiles(path);
      // Sortiere Ordner vor Dateien
      items.sort((a: NextcloudItem, b: NextcloudItem) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
      setNextcloudItems(items);
      setCurrentPath(path);
    } catch (err: any) {
      setNcError(err.message);
    } finally {
      setNcLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'nextcloud') {
      fetchNcFiles(currentPath);
    }
  }, [activeTab]);

  const handleAddClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onFilesAdded(e.target.files);
  };
  
  const handleLoadNextcloudTrack = async (deckId: DeckId, file: NextcloudItem) => {
    setLoadingTrack(file.path);
    try {
        const blob = await downloadNextcloudFile(file.path);
        const objectURL = URL.createObjectURL(blob);
        const track: Track = { id: `nc-${file.path}`, name: file.name, url: objectURL };
        onLoadTrack(deckId, track);
    } catch (err) {
        alert("Fehler beim Laden des Tracks von Nextcloud.");
    } finally {
        setLoadingTrack(null);
    }
  };

  const navigateTo = (path: string) => {
    fetchNcFiles(path);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    fetchNcFiles(parentPath);
  };

  const renderNextcloudLibrary = () => {
    if (ncLoading) return <div className="flex items-center justify-center h-full text-gray-500"><RefreshCw size={32} className="animate-spin" /><span className="ml-2">Lade...</span></div>;
    if (ncError) return <div className="flex flex-col items-center justify-center h-full text-red-400"><AlertTriangle size={48} /><p className="mt-2 font-semibold">Fehler</p><p className="text-sm text-center">{ncError}</p><button onClick={() => fetchNcFiles(currentPath)} className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg">Erneut versuchen</button></div>;
    
    return (
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700/60 sticky top-0 z-10">
                <tr>
                    <th scope="col" className="px-4 py-2">Name</th>
                    <th scope="col" className="px-4 py-2 text-right">Größe</th>
                    <th scope="col" className="px-4 py-2"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
                {/* "Zurück"-Button, wenn nicht im Hauptverzeichnis */}
                {currentPath !== '/' && (
                    <tr onClick={navigateUp} className="cursor-pointer hover:bg-gray-700/50">
                        <td colSpan={3} className="px-4 py-2 font-medium text-cyan-400 flex items-center"><ArrowLeft size={16} className="mr-2" />... (ein Verzeichnis zurück)</td>
                    </tr>
                )}
                {nextcloudItems.map((item) => {
                    const isLoadingThisTrack = loadingTrack === item.path;
                    const isAudioFile = item.type === 'file' && /\.(mp3|wav|ogg|flac|m4a)$/i.test(item.name);
                    return (
                        <tr key={item.path} className={`hover:bg-gray-700/50 transition-colors group ${item.type === 'directory' ? 'cursor-pointer' : ''}`}
                            onClick={item.type === 'directory' ? () => navigateTo(item.path) : undefined}>
                            <td className="px-4 py-2 font-medium text-white flex items-center">
                                {item.type === 'directory' ? <Folder size={16} className="mr-2 text-cyan-400" /> : <Music size={16} className="mr-2 text-gray-500" />}
                                {item.name}
                            </td>
                            <td className="px-4 py-2 text-gray-400 text-right">
                                {item.type === 'file' ? `${(item.size / 1024 / 1024).toFixed(2)} MB` : '--'}
                            </td>
                            <td className="px-4 py-2 text-right">
                                {isAudioFile && (
                                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleLoadNextcloudTrack('A', item); }} disabled={isLoadingThisTrack} className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-md disabled:bg-gray-500">
                                            {isLoadingThisTrack ? 'Lade...' : 'Load A'}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleLoadNextcloudTrack('B', item); }} disabled={isLoadingThisTrack} className="px-3 py-1 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-md disabled:bg-gray-500">
                                            {isLoadingThisTrack ? 'Lade...' : 'Load B'}
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
  };
  
  // ... (renderLocalLibrary und renderEmptyState bleiben größtenteils gleich)

  return (
    <div className="w-full max-w-7xl bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-4 mt-4">
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center border-b border-gray-700">
            <button onClick={() => setActiveTab('local')} className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-t-lg ${activeTab === 'local' ? 'bg-gray-700/60 text-white' : 'text-gray-400 hover:bg-gray-700/30'}`}><HardDrive size={16}/><span>Lokale Bibliothek</span></button>
            <button onClick={() => setActiveTab('nextcloud')} className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-t-lg ${activeTab === 'nextcloud' ? 'bg-gray-700/60 text-white' : 'text-gray-400 hover:bg-gray-700/30'}`}><Cloud size={16}/><span>Nextcloud</span></button>
        </div>
        {activeTab === 'local' && (
            <div>
                <input type="file" multiple accept="audio/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button onClick={handleAddClick} className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg"><UploadCloudIcon size={20} /><span>Add Tracks</span></button>
            </div>
        )}
      </header>
      {/* Breadcrumb-Navigation für Nextcloud */}
      {activeTab === 'nextcloud' && (
        <div className="text-sm text-gray-400 mb-2 px-1">
            Pfad: {currentPath}
        </div>
      )}
      <div className="h-64 overflow-y-auto bg-gray-900/50 rounded-lg border border-gray-700/50">
        {activeTab === 'local' ? (library.length === 0 ? <div>...</div> : <div>...</div>) : renderNextcloudLibrary()}
      </div>
    </div>
  );
};
