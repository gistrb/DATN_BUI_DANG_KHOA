// API Configuration
const hostname = window.location.hostname;

export const API_URL = `http://${hostname}:8000`;

export const APP_CONFIG = {
  appName: 'Face Attendance System',
  version: '1.0.0',
};

// Local storage keys
export const STORAGE_KEYS = {
  USER: 'user',
};

export default { API_URL, APP_CONFIG, STORAGE_KEYS };
