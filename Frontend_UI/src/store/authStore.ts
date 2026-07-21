import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthStore {
  token:   string | null;
  user:    User | null;
  isAuth:  boolean;

  setAuth:   (token: string, user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        token:  localStorage.getItem('auth_token'),
        user:   null,
        isAuth: !!localStorage.getItem('auth_token'),

        setAuth: (token, user) => {
          localStorage.setItem('auth_token', token);
          set({ token, user, isAuth: true }, false, 'setAuth');
        },

        clearAuth: () => {
          localStorage.removeItem('auth_token');
          set({ token: null, user: null, isAuth: false }, false, 'clearAuth');
        },

        updateUser: (partial) => {
          const current = get().user;
          if (current) {
            set({ user: { ...current, ...partial } }, false, 'updateUser');
          }
        },
      }),
      {
        name:       'food-auth',
        partialize: (state) => ({ token: state.token, user: state.user }),
      },
    ),
    { name: 'AuthStore' },
  ),
);
