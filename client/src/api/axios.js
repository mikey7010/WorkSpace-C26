import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` : '/api';
const api = axios.create({ baseURL: apiBase });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ws_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ws_token');
      localStorage.removeItem('ws_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
