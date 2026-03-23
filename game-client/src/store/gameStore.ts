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
  setBookWorld: (book: BookWorld | null) => void;
  setNpcsInScene: (npcs: NpcInfo[]) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentPage: 'story',
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
    if (current === page) return;
    set({ isTransitioning: true, previousPage: current, pageParams: params || {} });
    setTimeout(() => {
      set({ currentPage: page, isTransitioning: false });
    }, 150);
  },

  setBookWorld: (book) => set({ currentBookWorld: book }),
  setNpcsInScene: (npcs) => set({ npcsInScene: npcs }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
