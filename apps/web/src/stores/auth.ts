import { create } from 'zustand';
import { api, refreshAccessToken, setAccessToken } from '@/lib/api';
import type { User } from '@/lib/types';
import { useCart } from './cart';
import { useWishlist } from './wishlist';

interface AuthState {
  user: User | null;
  status: 'loading' | 'authenticated' | 'guest';
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  /** Public demo only: one-click sign-in as the demo customer or admin. */
  demoLogin: (role: 'customer' | 'admin') => Promise<User>;
  register: (input: { firstName: string; lastName: string; email: string; password: string; newsletter?: boolean }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

async function afterSignIn() {
  // The API merged any guest cart into the account; refresh local state.
  await Promise.all([useCart.getState().fetch(), useWishlist.getState().syncAccount()]);
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  init: async () => {
    // Only attempt a silent refresh when the API has signalled a session exists.
    const hasSession = typeof document !== 'undefined' && /(?:^|;\s*)maison_session=1/.test(document.cookie);
    const token = hasSession ? await refreshAccessToken() : null;
    if (!token) {
      set({ user: null, status: 'guest' });
      useWishlist.getState().hydrateGuest();
      return;
    }
    try {
      const user = await api<User>('/auth/me', { cache: 'no-store' });
      set({ user, status: 'authenticated' });
      await useWishlist.getState().syncAccount();
    } catch {
      set({ user: null, status: 'guest' });
      useWishlist.getState().hydrateGuest();
    }
  },

  login: async (email, password) => {
    const res = await api<{ user: User; accessToken: string }>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'authenticated' });
    await afterSignIn();
    return res.user;
  },

  demoLogin: async (role) => {
    const res = await api<{ user: User; accessToken: string }>('/auth/demo-login', { method: 'POST', body: { role }, auth: false });
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'authenticated' });
    await afterSignIn();
    return res.user;
  },

  register: async (input) => {
    const res = await api<{ user: User; accessToken: string }>('/auth/register', { method: 'POST', body: input, auth: false });
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'authenticated' });
    await afterSignIn();
    return res.user;
  },

  logout: async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    set({ user: null, status: 'guest' });
    useCart.getState().reset();
    useWishlist.getState().signOut();
  },

  setUser: (user) => set({ user }),
}));
