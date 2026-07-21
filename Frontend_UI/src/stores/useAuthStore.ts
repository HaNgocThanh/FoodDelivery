import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserInfo {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface AuthStoreState {
  token: string | null;
  user: UserInfo | null;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: (token: string, user: UserInfo) => {
        set({ token, user });
      },

      logout: () => {
        set({ token: null, user: null });
      },

      isAuthenticated: () => {
        return !!get().token;
      },

      isAdmin: () => {
        const user = get().user;
        return !!user && user.role?.toLowerCase() === 'admin';
      },
    }),
    {
      name: 'fooddelivery_auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
