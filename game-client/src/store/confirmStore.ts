import { create } from 'zustand';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  pending: PendingConfirm | null;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  answer: (ok: boolean) => void;
}

let seq = 0;

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,

  ask: (options) =>
    new Promise<boolean>((resolve) => {
      const cur = get().pending;
      if (cur) cur.resolve(false);
      set({ pending: { id: ++seq, resolve, ...options } });
    }),

  answer: (ok) => {
    const cur = get().pending;
    if (!cur) return;
    cur.resolve(ok);
    set({ pending: null });
  },
}));

/** 便捷调用：const ok = await confirmDialog({ message: '...' }) */
export const confirmDialog = (options: ConfirmOptions) =>
  useConfirmStore.getState().ask(options);
