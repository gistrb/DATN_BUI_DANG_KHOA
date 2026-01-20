// API Configuration - reads from Vite environment variables
const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// Production backend URL on Render (without /api suffix, since api.js adds it)
const PRODUCTION_API_URL = 'https://attendance-backend-8pnk.onrender.com';

// Use environment variable if available, otherwise:
// - Use localhost:8000 for local development
// - Use production URL for deployed frontend
export const API_URL = import.meta.env.VITE_API_URL || (isLocalhost ? `http://${hostname}:8000` : PRODUCTION_API_URL);

export const APP_CONFIG = {
  appName: import.meta.env.VITE_APP_NAME || 'Face Attendance System',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
};

// Local storage keys
export const STORAGE_KEYS = {
  USER: 'user',
};

export default { API_URL, APP_CONFIG, STORAGE_KEYS };
