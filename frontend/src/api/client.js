import axios from 'axios';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Interceptor odpowiedzi
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Pomiń przekierowanie dla prób logowania
        if (error.config?.url?.includes('/login')) {
            return Promise.reject(error);
        }

        // Obsługa braku autoryzacji
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
