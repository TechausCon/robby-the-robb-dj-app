// src/components/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { requestPasswordReset } from '../services/api';
import AuthLayout from './AuthLayout';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const data = await requestPasswordReset({ email });
      setMessage(data.msg);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout title="Passwort vergessen">
      <form onSubmit={handleRequest} className="space-y-6 mt-6">
        <p className="text-sm text-center text-gray-300">
          Gib deine E-Mail-Adresse ein. Wir senden dir einen Link, um dein Passwort zurückzusetzen.
        </p>
        <input
          type="email"
          placeholder="E-Mail-Adresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          required
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {message && <p className="text-green-500 text-sm text-center">{message}</p>}
        <button type="submit" className="w-full py-2 px-4 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors">
          Reset-Link anfordern
        </button>
      </form>
       <p className="text-sm text-center text-gray-400 mt-6">
        Zurück zum <a href="/login" className="font-medium text-cyan-400 hover:underline">Login</a>
      </p>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
