import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

// Attach admin token if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nora_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize backend error shape { error: { message } } into a thrown Error.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error?.message || err.message || 'حدث خطأ';
    if (err.response?.status === 401 && localStorage.getItem('nora_token')) {
      localStorage.removeItem('nora_token');
      if (location.pathname.startsWith('/admin') && location.pathname !== '/admin/login') {
        location.href = '/admin/login';
      }
    }
    return Promise.reject(new Error(message));
  }
);
