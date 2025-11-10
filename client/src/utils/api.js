import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL || 'http://localhost:5000',
});

// Add token to request header
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    login: (credentials) => api.post('/api/auth/login', credentials),
    register: (userData) => api.post('/api/auth/register', userData),
    getProfile: () => api.get('/api/auth/profile'),
};

export const messageAPI = {
    getMessages: (params) => api.get('/api/messages', { params }),
    getMessagesByRoom: (roomId, params) => 
        api.get(`/api/messages/${roomId}`, { params }),
};

export const userAPI = {
    getUsers: () => api.get('/api/users'),
    updateProfile: (data) => api.put('/api/users/profile', data),
};

export default api;