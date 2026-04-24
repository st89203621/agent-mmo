import { create } from 'zustand';
import type { PageId, BookWorld, NpcInfo } from '../types';

interface GameState {
  currentPage: PageId;
  previousPage: PageId | null;
  isTransitioning: boolean;
  currentBookWorld: BookWorld | null;
  npcsInScene: NpcInfo[];
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  pageParams: Record<string, unknown>;

  navigateTo: (page: PageId, params?: Record<string, unknown>) => void;
  replaceTo: (page: PageId, params?: Record<string, unknown>) => void;
  setBookWorld: (book: BookWorld | null) => void;
  setNpcsInScene: (npcs: NpcInfo[]) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentPage: 'home',
  previousPage: null,
  isTransitioning: false,
  currentBookWorld: null,
  npcsInScene: [],
  isConnected: false,
  loading: false,
  error: null,
  pageParams: {},

  navigateTo: (page, params) => {
    const current = get().currentPage;
    if (current === page) {
      // 同页面时仅更新参数（支持 tab 切换等场景）
      if (params) set({ pageParams: params });
      return;
    }
    set({ currentPage: page, previousPage: current, pageParams: params || {} });
  },
  replaceTo: (page, params) => {
    set({ currentPage: page, pageParams: params || {} });
  },

  setBookWorld: (book) => set({ currentBookWorld: book }),
  setNpcsInScene: (npcs) => set({ npcsInScene: npcs }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
