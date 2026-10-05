import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'success' | 'error';
  action?: { label: string; href: string };
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, opts?: { tone?: Toast['tone']; action?: Toast['action']; duration?: number }) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, opts = {}) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone: opts.tone ?? 'default', action: opts.action }] });
    setTimeout(() => get().dismiss(id), opts.duration ?? 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  show: (m: string, o?: Parameters<ToastState['show']>[1]) => useToast.getState().show(m, o),
  success: (m: string, o?: Parameters<ToastState['show']>[1]) => useToast.getState().show(m, { ...o, tone: 'success' }),
  error: (m: string, o?: Parameters<ToastState['show']>[1]) => useToast.getState().show(m, { ...o, tone: 'error' }),
};
