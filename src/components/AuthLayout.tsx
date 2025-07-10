// src/components/AuthLayout.tsx
import React from 'react';
// KORREKTUR: Der Pfad wurde angepasst, um vom 'components'-Ordner
// zwei Ebenen nach oben ins Hauptverzeichnis zu gelangen.
import RobbyLogo from '../../assets/robby-logo.png';

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, children }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div className="flex flex-col items-center space-y-4">
          <img src={RobbyLogo} alt="Robby the Robb Logo" className="h-24 w-24" />
          <h1 className="text-3xl font-bold text-center text-white">
            Robby the Robb <span className="text-cyan-400">DJ APP</span>
          </h1>
          <h2 className="text-2xl font-semibold text-gray-300">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
