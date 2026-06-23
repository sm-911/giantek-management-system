import axios from 'axios';

// Create a shared Axios instance with base URL and auth header
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Automatically attach the JWT token on every request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('giantek_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
// If the backend returns 401, clear session and redirect to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('giantek_token');
      localStorage.removeItem('giantek_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
