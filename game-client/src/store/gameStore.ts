import { create } from 'zustand';
import type { PageId, BookWorld, NpcInfo } from '../types';

const HISTORY_LIMIT = 32;
const FALLBACK_PAGE: PageId = 'home';

interface GameState {
  currentPage: PageId;
  previousPage: PageId | null;
  history: PageId[];
  isTransitioning: boolean;
  currentBookWorld: BookWorld | null;
  npcsInScene: NpcInfo[];
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  pageParams: Record<string, unknown>;

  navigateTo: (page: PageId, params?: Record<string, unknown>) => void;
  replaceTo: (page: PageId, params?: Record<string, unknown>) => void;
  back: (fallback?: PageId) => void;
  setBookWorld: (book: BookWorld | null) => void;
  setNpcsInScene: (npcs: NpcInfo[]) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentPage: 'home',
  previousPage: null,
  history: [],
  isTransitioning: false,
  currentBookWorld: null,
  npcsInScene: [],
  isConnected: false,
  loading: false,
  error: null,
  pageParams: {},

  navigateTo: (page, params) => {
    const { currentPage: current, history } = get();
    if (current === page) {
      if (params) set({ pageParams: params });
      return;
    }
    const next = [...history, current];
    if (next.length > HISTORY_LIMIT) next.shift();
    set({ currentPage: page, previousPage: current, history: next, pageParams: params || {} });
  },
  replaceTo: (page, params) => {
    set({ currentPage: page, pageParams: params || {} });
  },
  back: (fallback = FALLBACK_PAGE) => {
    const { history, currentPage: current } = get();
    if (history.length === 0) {
      if (current === fallback) return;
      set({ currentPage: fallback, previousPage: current, pageParams: {} });
      return;
    }
    const next = history.slice(0, -1);
    const target = history[history.length - 1];
    set({ currentPage: target, previousPage: current, history: next, pageParams: {} });
  },

  setBookWorld: (book) => set({ currentBookWorld: book }),
  setNpcsInScene: (npcs) => set({ npcsInScene: npcs }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
