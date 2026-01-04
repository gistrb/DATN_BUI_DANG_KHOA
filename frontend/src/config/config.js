// API Configuration - reads from Vite environment variables
const hostname = window.location.hostname;

// Use environment variable if available, otherwise use dynamic hostname
export const API_URL = import.meta.env.VITE_API_URL || `http://${hostname}:8000`;

export const APP_CONFIG = {
  appName: import.meta.env.VITE_APP_NAME || 'Face Attendance System',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
};

// Local storage keys
export const STORAGE_KEYS = {
  USER: 'user',
};

export default { API_URL, APP_CONFIG, STORAGE_KEYS };
