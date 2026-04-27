import { create } from 'zustand';
import type { Relation, PlayerWorld, Equipment, Pet } from '../types';
import type { ServerInfo } from '../services/api';

interface GlobalFate {
  totalFate: number;
  totalTrust: number;
  currentFate: number;
  currentTrust: number;
  fateGrade: string;
  worldIndex: number;
}

export interface LevelInfo {
  level: number;
  exp: number;
  maxExp: number;
}

interface PlayerState {
  playerId: string;
  playerName: string;
  token: string;
  currentWorldIndex: number;
  playerWorld: PlayerWorld | null;
  relations: Relation[];
  equipment: Equipment[];
  pets: Pet[];
  personCreated: boolean;
  gold: number;
  diamond: number;
  globalFate: GlobalFate | null;
  levelInfo: LevelInfo | null;
  currentServer: ServerInfo | null;

  setPlayer: (id: string, name: string, token: string) => void;
  setCurrentWorld: (index: number) => void;
  setPlayerWorld: (world: PlayerWorld) => void;
  setRelations: (relations: Relation[]) => void;
  updateRelation: (npcId: string, fateDelta: number, trustDelta: number) => void;
  setPersonCreated: (created: boolean) => void;
  setCurrency: (gold: number, diamond: number) => void;
  setGlobalFate: (fate: GlobalFate) => void;
  setLevelInfo: (info: LevelInfo | null) => void;
  setCurrentServer: (server: ServerInfo) => void;
  clearPlayer: () => void;
}

const SERVER_KEY = 'lunhui.currentServer';

function loadServer(): ServerInfo | null {
  try {
    const raw = localStorage.getItem(SERVER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.name) return parsed as ServerInfo;
    }
  } catch { /* noop */ }
  return null;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  playerId: '',
  playerName: '',
  token: '',
  currentWorldIndex: 0,
  playerWorld: null,
  relations: [],
  equipment: [],
  pets: [],
  personCreated: false,
  gold: 0,
  diamond: 0,
  globalFate: null,
  levelInfo: null,
  currentServer: loadServer(),

  setPlayer: (id, name, token) => set({ playerId: id, playerName: name, token }),
  setCurrentWorld: (index) => set({ currentWorldIndex: index }),
  setPlayerWorld: (world) => set({ playerWorld: world }),
  setRelations: (relations) => set({ relations }),
  setPersonCreated: (created) => set({ personCreated: created }),
  setCurrency: (gold, diamond) => set({ gold, diamond }),
  setGlobalFate: (fate) => set({ globalFate: fate }),
  setLevelInfo: (info) => set({ levelInfo: info }),
  setCurrentServer: (server) => {
    try { localStorage.setItem(SERVER_KEY, JSON.stringify(server)); } catch { /* noop */ }
    set({ currentServer: server });
  },
  clearPlayer: () => set({
    playerId: '', playerName: '', token: '', currentWorldIndex: 0,
    playerWorld: null, relations: [], equipment: [], pets: [],
    personCreated: false, gold: 0, diamond: 0, globalFate: null, levelInfo: null,
  }),
  updateRelation: (npcId, fateDelta, trustDelta) =>
    set((state) => ({
      relations: state.relations.map((r) =>
        r.npcId === npcId
          ? {
              ...r,
              fateScore: Math.min(100, Math.max(0, r.fateScore + fateDelta)),
              trustScore: Math.min(100, Math.max(0, r.trustScore + trustDelta)),
            }
          : r,
      ),
    })),
}));
