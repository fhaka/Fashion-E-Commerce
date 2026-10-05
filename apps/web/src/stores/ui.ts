import { create } from 'zustand';

interface UiState {
  cartOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  /** Tone of the hero image currently under the transparent header. */
  heroTone: 'dark' | 'light';
  /** True while the header is slid away (scrolling down) — sticky toolbars move up to fill the gap. */
  headerHidden: boolean;
  setHeaderHidden: (hidden: boolean) => void;
  setHeroTone: (tone: 'dark' | 'light') => void;
  openCart: () => void;
  closeCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setMenu: (open: boolean) => void;
}

/** Only one overlay is open at a time. */
export const useUi = create<UiState>((set) => ({
  cartOpen: false,
  searchOpen: false,
  menuOpen: false,
  heroTone: 'dark',
  headerHidden: false,
  setHeaderHidden: (headerHidden) => set({ headerHidden }),
  setHeroTone: (heroTone) => set({ heroTone }),
  openCart: () => set({ cartOpen: true, searchOpen: false, menuOpen: false }),
  closeCart: () => set({ cartOpen: false }),
  openSearch: () => set({ searchOpen: true, cartOpen: false, menuOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
  setMenu: (open) => set({ menuOpen: open, ...(open ? { cartOpen: false, searchOpen: false } : {}) }),
}));
