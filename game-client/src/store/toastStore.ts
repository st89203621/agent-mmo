import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'reward';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  show: (type: ToastType, message: string, duration?: number) => void;
  remove: (id: string) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (type, message, duration = 2500) => {
    const id = `toast_${++seq}_${Date.now()}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** 便捷方法 */
export const toast = {
  success: (msg: string) => useToastStore.getState().show('success', msg),
  error: (msg: string) => useToastStore.getState().show('error', msg, 3500),
  info: (msg: string) => useToastStore.getState().show('info', msg),
  warning: (msg: string) => useToastStore.getState().show('warning', msg, 3000),
  reward: (msg: string) => useToastStore.getState().show('reward', msg, 3500),
};
