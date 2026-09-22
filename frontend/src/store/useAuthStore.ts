import { create } from 'zustand';
import type { AdminUser } from '../types';

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const STORAGE_TOKEN = 'latorre_admin_token';
const STORAGE_USER = 'latorre_admin_user';

function loadUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(STORAGE_TOKEN),
  user: loadUser(),
  login: (token, user) => {
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    set({ token: null, user: null });
  },
  isAuthenticated: () => !!get().token,
}));
