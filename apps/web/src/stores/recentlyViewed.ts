import { create } from 'zustand';

const KEY = 'maison:recently-viewed';
const MAX = 12;

interface RecentState {
  ids: string[];
  hydrated: boolean;
  hydrate: () => void;
  track: (productId: string) => void;
}

export const useRecentlyViewed = create<RecentState>((set, get) => ({
  ids: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      set({ ids: Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, MAX) : [], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  track: (productId) => {
    get().hydrate();
    const ids = [productId, ...get().ids.filter((id) => id !== productId)].slice(0, MAX);
    set({ ids });
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* storage unavailable */
    }
  },
}));
