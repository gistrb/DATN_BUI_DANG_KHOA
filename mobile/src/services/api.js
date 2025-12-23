import { API_URL, DEFAULT_HEADERS } from '../config/config';

/**
 * Login API call
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{success: boolean, data?: object, error?: string, statusCode?: number}>}
 */
export const login = async (username, password) => {
  try {
    const response = await fetch(`${API_URL}/login/`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ username, password }),
    });

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    return {
      success: data.success,
      data: data,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch employee statistics
 * @param {number} employeeId 
 * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
 */
export const fetchStats = async (employeeId) => {
  try {
    const response = await fetch(`${API_URL}/stats/${employeeId}/`, {
      headers: DEFAULT_HEADERS,
    });
    const responseText = await response.text();
    const data = JSON.parse(responseText);

    return {
      success: data.success,
      stats: data.stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch attendance history
 * @param {number} employeeId 
 * @returns {Promise<{success: boolean, history?: array, error?: string}>}
 */
export const fetchHistory = async (employeeId) => {
  try {
    const response = await fetch(`${API_URL}/history/${employeeId}/`, {
      headers: DEFAULT_HEADERS,
    });
    const responseText = await response.text();
    const data = JSON.parse(responseText);

    return {
      success: data.success,
      history: data.history,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch all employee data (stats and history)
 * @param {number} employeeId 
 * @returns {Promise<{stats?: object, history?: array}>}
 */
export const fetchEmployeeData = async (employeeId) => {
  const [statsResult, historyResult] = await Promise.all([
    fetchStats(employeeId),
    fetchHistory(employeeId),
  ]);

  return {
    stats: statsResult.success ? statsResult.stats : null,
    history: historyResult.success ? historyResult.history : [],
  };
};

/**
 * Register push token with backend
 * @param {string} pushToken - Expo Push Token
 * @param {string} employeeId - Employee ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const registerPushToken = async (pushToken, employeeId) => {
  try {
    const response = await fetch(`${API_URL}/push-token/`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        push_token: pushToken,
        employee_id: employeeId,
      }),
    });
    
    const data = await response.json();
    return {
      success: data.success,
      error: data.error,
    };
  } catch (error) {
    console.error('Error registering push token:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
