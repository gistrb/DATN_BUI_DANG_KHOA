import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};
export const API_URL = extra.apiUrl;

export const APP_CONFIG = {
  appName: extra.appName || 'Attendance App',
  version: extra.appVersion || '1.0.0',
};
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Bypass-Tunnel-Reminder': 'true',
};
