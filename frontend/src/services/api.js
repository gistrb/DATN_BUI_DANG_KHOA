import axios from 'axios';

// Production: sử dụng VITE_API_URL từ environment
// Development: để trống để dùng Vite proxy
const API_URL = import.meta.env.VITE_API_URL || '';

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
export const processAttendance = async (embedding) => {
    const response = await api.post('/process-attendance/', { embedding: embedding });
    return response.data;
};

export const registerFace = async (employeeId, embeddings) => {
    const response = await api.post('/register-face/', { employee_id: employeeId, embeddings });
    return response.data;
};

export const deleteFace = async (employeeId) => {
    const response = await api.post('/delete-face/', { employee_id: employeeId });
    return response.data;
};

export default api;
