// src/components/SettingsPage.tsx
import React, { useState } from 'react';
import { saveNextcloudCredentials } from '../services/api';
import { Cloud, KeyRound, Server, User, X } from 'lucide-react';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ isOpen, onClose }) => {
  const [nextcloudUrl, setNextcloudUrl] = useState('');
  const [nextcloudUser, setNextcloudUser] = useState('');
  const [nextcloudPass, setNextcloudPass] = useState('');
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSaveNextcloud = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await saveNextcloudCredentials({
        serverUrl: nextcloudUrl,
        username: nextcloudUser,
        password: nextcloudPass,
      });
      setMessage(response.msg);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Einstellungen</h2>

        {/* Nextcloud Sektion */}
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center">
            <Cloud className="mr-2" size={20} />
            Nextcloud Anbindung
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Verbinde deine Nextcloud, um deine Musik direkt aus deiner Cloud zu laden.
            <strong>Wichtig:</strong> Erstelle in Nextcloud ein "App-Passwort" und verwende dieses hier, nicht dein normales Passwort.
          </p>
          <form onSubmit={handleSaveNextcloud} className="space-y-4">
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="url"
                placeholder="Nextcloud Server URL (z.B. https://cloud.meinedomain.de)"
                value={nextcloudUrl}
                onChange={(e) => setNextcloudUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Nextcloud Benutzername"
                value={nextcloudUser}
                onChange={(e) => setNextcloudUser(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                placeholder="Nextcloud App-Passwort"
                value={nextcloudPass}
                onChange={(e) => setNextcloudPass(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {message && <p className="text-green-500 text-sm text-center">{message}</p>}
            <button type="submit" className="w-full py-2 px-4 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors">
              Verbindung speichern
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
