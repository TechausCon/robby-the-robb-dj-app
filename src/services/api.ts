// src/services/api.ts

// KORREKTUR: Die URL zeigt jetzt wieder auf dein lokales Backend.
const API_URL = 'http://localhost:3001/api';

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('x-auth-token', token);
  }
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) throw new Error('Netzwerkfehler beim Dateidownload');
      return response;
  }

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData?.msg || 'Ein API-Fehler ist aufgetreten.');
  }
  return responseData;
};

const downloadFileApi = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetchApi(endpoint, options) as Response;
    return response.blob();
};



export const loginUser = (credentials: any) => fetchApi('/login', { method: 'POST', body: JSON.stringify(credentials) });
export const registerUser = (credentials: any) => fetchApi('/register', { method: 'POST', body: JSON.stringify(credentials) });
export const getUserSettings = () => fetchApi('/settings', { method: 'GET' });
export const saveUserSettings = (settings: any) => fetchApi('/settings', { method: 'PUT', body: JSON.stringify(settings) });
export const requestPasswordReset = (data: { email: string }) => fetchApi('/forgot-password', { method: 'POST', body: JSON.stringify(data) });
export const resetPassword = (data: { token?: string; password?: string }) => fetchApi('/reset-password', { method: 'POST', body: JSON.stringify(data) });
export const saveNextcloudCredentials = (credentials: any) => fetchApi('/settings/nextcloud', { method: 'POST', body: JSON.stringify(credentials) });
export const getNextcloudFiles = (path: string = '/') => fetchApi('/nextcloud/files', { method: 'POST', body: JSON.stringify({ path }) });
export const downloadNextcloudFile = (path: string) => downloadFileApi('/nextcloud/download', { method: 'POST', body: JSON.stringify({ path }) });
