// src/components/RegisterPage.tsx
import React, { useState } from 'react';
import { registerUser } from '../services/api';
import AuthLayout from './AuthLayout';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // NEU: State für die E-Mail
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      // NEU: E-Mail wird an die API gesendet
      await registerUser({ username, email, password });
      setSuccess('Erfolgreich registriert! Bitte prüfe dein Postfach. Du wirst weitergeleitet...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout title="Registrieren">
      <form onSubmit={handleRegister} className="space-y-6 mt-6">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          required
        />
        {/* NEU: Input-Feld für die E-Mail-Adresse */}
        <input
          type="email"
          placeholder="E-Mail-Adresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          required
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-500 text-sm text-center">{success}</p>}
        <button type="submit" className="w-full py-2 px-4 font-bold text-white bg-purple-600 rounded-md hover:bg-purple-500 transition-colors">
          Registrieren
        </button>
      </form>
      <p className="text-sm text-center text-gray-400 mt-6">
        Bereits einen Account? <a href="/login" className="font-medium text-cyan-400 hover:underline">Login</a>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;
