import { clearSessionCache } from '../api/queryClient';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type MembershipTier = 'Standard' | 'Silver' | 'Gold' | 'Platinum';

export interface UserInfo {
  id: number;
  fullName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  address1?: string;
  address2?: string;
  loyaltyPoints?: number;
  tier?: MembershipTier;
}

/**
 * Chuẩn hoá tier từ cả 2 dạng mà backend có thể trả:
 *  - String: "Standard" | "Silver" | "Gold" | "Platinum"
 *  - Integer (System.Text.Json mặc định): 0/1/2/3
 *  - String-of-number: "1"
 * → luôn trả về MembershipTier hợp lệ.
 */
export function normalizeTier(raw: unknown): MembershipTier {
  if (typeof raw === 'number') {
    switch (raw) {
      case 3: return 'Platinum';
      case 2: return 'Gold';
      case 1: return 'Silver';
      default: return 'Standard';
    }
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s === 'Platinum' || s === 'Gold' || s === 'Silver' || s === 'Standard') {
      return s as MembershipTier;
    }
    const n = Number(s);
    if (!Number.isNaN(n)) {
      switch (n) {
        case 3: return 'Platinum';
        case 2: return 'Gold';
        case 1: return 'Silver';
        default: return 'Standard';
      }
    }
  }
  return 'Standard';
}

interface AuthStoreState {
  token: string | null;
  user: UserInfo | null;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  /**
   * Cập nhật một phần thông tin user (dùng để sync loyaltyPoints/tier sau khi đặt hàng,
   * tránh phải gọi lại API /auth/me).
   */
  updateUser: (patch: Partial<UserInfo>) => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: (token: string, user: UserInfo) => {
        clearSessionCache();
        localStorage.removeItem('auth_token');
        set({ token, user });
      },

      logout: () => {
        clearSessionCache();
        localStorage.removeItem('auth_token');
        set({ token: null, user: null });
      },

      updateUser: (patch: Partial<UserInfo>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : null,
        }));
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
