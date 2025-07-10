// src/services/api.ts

const API_URL = 'http://localhost:3001/api';

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');

  // KORREKTUR: Die 'Headers'-Klasse wird verwendet, um Header robust und typsicher zu erstellen.
  // Das behebt den TypeScript-Fehler und ist die empfohlene Vorgehensweise.
  const headers = new Headers(options.headers);

  // Setzt den Content-Type, falls er nicht schon explizit gesetzt wurde.
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Fügt den Authentifizierungs-Token hinzu, falls vorhanden.
  if (token) {
    headers.set('x-auth-token', token);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers, // Übergibt das fertige Headers-Objekt
  });

  const contentType = response.headers.get('content-type');
  const responseData = contentType && contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(responseData?.msg || 'Ein API-Fehler ist aufgetreten.');
  }
  
  return responseData;
};

export const loginUser = (credentials: any) => fetchApi('/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const registerUser = (credentials: any) => fetchApi('/register', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const getUserSettings = () => fetchApi('/settings', {
  method: 'GET',
});

export const saveUserSettings = (settings: any) => fetchApi('/settings', {
  method: 'PUT',
  body: JSON.stringify(settings),
});

// NEU: API-Funktionen für Passwort-Reset
export const requestPasswordReset = (data: { email: string }) => fetchApi('/forgot-password', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const resetPassword = (data: { token?: string; password?: string }) => fetchApi('/reset-password', {
  method: 'POST',
  body: JSON.stringify(data),
});
