import { create } from 'zustand';
import { api } from '@/lib/api';
import { toast } from './toast';

const KEY = 'maison:wishlist';

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, 100) : [];
  } catch {
    return [];
  }
}
function writeLocal(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable (private mode) — keep in memory only */
  }
}

interface WishlistState {
  ids: string[];
  signedIn: boolean;
  /** Guest: load from localStorage. */
  hydrateGuest: () => void;
  /** Signed in: push any guest items to the account, then load the account list. */
  syncAccount: () => Promise<void>;
  signOut: () => void;
  has: (productId: string) => boolean;
  toggle: (productId: string, name?: string) => Promise<void>;
}

export const useWishlist = create<WishlistState>((set, get) => ({
  ids: [],
  signedIn: false,

  hydrateGuest: () => set({ ids: readLocal(), signedIn: false }),

  syncAccount: async () => {
    const guest = readLocal();
    for (const id of guest) {
      await api(`/wishlist/${id}`, { method: 'POST' }).catch(() => undefined);
    }
    writeLocal([]);
    const ids = await api<string[]>('/wishlist/ids', { cache: 'no-store' }).catch(() => [] as string[]);
    set({ ids, signedIn: true });
  },

  signOut: () => set({ ids: readLocal(), signedIn: false }),

  has: (productId) => get().ids.includes(productId),

  toggle: async (productId, name) => {
    const { ids, signedIn } = get();
    const adding = !ids.includes(productId);
    const next = adding ? [productId, ...ids] : ids.filter((x) => x !== productId);
    set({ ids: next });
    if (!signedIn) {
      writeLocal(next);
    } else {
      try {
        const serverIds = await api<string[]>(`/wishlist/${productId}`, { method: adding ? 'POST' : 'DELETE' });
        set({ ids: serverIds });
      } catch {
        set({ ids });
        toast.error('We could not update your wishlist. Please try again.');
        return;
      }
    }
    if (adding) toast.show(`${name ?? 'Item'} saved to your wishlist`, { action: { label: 'View', href: '/wishlist' } });
  },
}));
