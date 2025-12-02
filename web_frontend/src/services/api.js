import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const login = async (username, password) => {
    try {
        const response = await api.post('/api/login/', { username, password });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};

export const getStats = async (employeeId) => {
    try {
        const response = await api.get(`/api/stats/${employeeId}/`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};

export const getHistory = async (employeeId) => {
    try {
        const response = await api.get(`/api/history/${employeeId}/`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};

// Face API calls
export const processAttendance = async (imageData) => {
    const response = await axios.post('http://127.0.0.1:8000/process-attendance/', { image: imageData });
    return response.data;
};

export const registerFace = async (employeeId, images) => {
    const response = await axios.post('http://127.0.0.1:8000/register-face/', { employee_id: employeeId, images });
    return response.data;
};

export default api;
