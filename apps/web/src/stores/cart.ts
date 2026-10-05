import { create } from 'zustand';
import { api, ApiRequestError } from '@/lib/api';
import type { Cart } from '@/lib/types';
import { toast } from './toast';
import { useUi } from './ui';

const EMPTY: Cart = { id: null, items: [], itemCount: 0, subtotal: 0, hasIssues: false };

interface CartState {
  cart: Cart;
  loaded: boolean;
  pending: Set<string>;
  fetch: () => Promise<void>;
  add: (variantId: string, quantity?: number, opts?: { openDrawer?: boolean; productName?: string }) => Promise<boolean>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  reset: () => void;
}

function errorMessage(err: unknown) {
  return err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.';
}

export const useCart = create<CartState>((set, get) => ({
  cart: EMPTY,
  loaded: false,
  pending: new Set(),

  fetch: async () => {
    try {
      set({ cart: await api<Cart>('/cart', { cache: 'no-store' }), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  add: async (variantId, quantity = 1, opts = {}) => {
    set({ pending: new Set(get().pending).add(variantId) });
    try {
      const cart = await api<Cart>('/cart/items', { method: 'POST', body: { variantId, quantity } });
      set({ cart });
      if (opts.openDrawer !== false) useUi.getState().openCart();
      else toast.success(`${opts.productName ?? 'Item'} added to your bag`);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      const pending = new Set(get().pending);
      pending.delete(variantId);
      set({ pending });
    }
  },

  update: async (itemId, quantity) => {
    const previous = get().cart;
    // Optimistic update for a snappy stepper.
    set({
      cart: {
        ...previous,
        items: previous.items.map((i) => (i.id === itemId ? { ...i, quantity, lineTotal: i.unitPrice * quantity } : i)),
      },
    });
    try {
      set({ cart: await api<Cart>(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } }) });
    } catch (err) {
      set({ cart: previous });
      toast.error(errorMessage(err));
    }
  },

  remove: async (itemId) => {
    const previous = get().cart;
    set({ cart: { ...previous, items: previous.items.filter((i) => i.id !== itemId) } });
    try {
      set({ cart: await api<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' }) });
    } catch (err) {
      set({ cart: previous });
      toast.error(errorMessage(err));
    }
  },

  reset: () => set({ cart: EMPTY }),
}));
