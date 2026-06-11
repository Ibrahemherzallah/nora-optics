import { create } from 'zustand';
import { api } from '../lib/api';

interface AuthState {
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('nora_token'),
  username: localStorage.getItem('nora_username'),
  login: async (username, password) => {
    const { data } = await api.post('/admin/auth/login', { username, password });
    localStorage.setItem('nora_token', data.token);
    localStorage.setItem('nora_username', data.username);
    set({ token: data.token, username: data.username });
  },
  logout: () => {
    localStorage.removeItem('nora_token');
    localStorage.removeItem('nora_username');
    set({ token: null, username: null });
  },
}));
