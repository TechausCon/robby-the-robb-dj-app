// src/components/LoginPage.tsx
import React, { useState } from 'react';
import { loginUser } from '../services/api';
import AuthLayout from './AuthLayout';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await loginUser({ username, password });
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        window.location.href = '/app';
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout title="Login">
      <form onSubmit={handleLogin} className="space-y-6 mt-6">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
        {/* HIER IST DER LINK: */}
        <div className="text-right">
            <a href="/forgot-password" className="text-xs text-cyan-400 hover:underline">Passwort vergessen?</a>
        </div>
        {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
        <button type="submit" className="w-full py-2 px-4 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors">
          Log In
        </button>
      </form>
      <p className="text-sm text-center text-gray-400 mt-6">
        Noch kein Account? <a href="/register" className="font-medium text-cyan-400 hover:underline">Registrieren</a>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;
