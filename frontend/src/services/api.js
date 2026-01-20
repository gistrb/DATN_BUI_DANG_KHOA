import axios from 'axios';
import { API_URL } from '../config/config';

// API_URL is imported from config which automatically handles:
// - localhost development: http://localhost:8000
// - production (Render): https://attendance-backend-8pnk.onrender.com

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
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
    const response = await api.post('/process-attendance/', { image: imageData });
    return response.data;
};

export const registerFace = async (employeeId, images) => {
    const response = await api.post('/register-face/', { employee_id: employeeId, images });
    return response.data;
};

export const deleteFace = async (employeeId) => {
    const response = await api.post('/delete-face/', { employee_id: employeeId });
    return response.data;
};

export default api;
