import { create } from 'zustand';
import type { Relation, PlayerWorld, Equipment, Pet } from '../types';

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
  currentServerId: string;
  currentServerName: string;

  setPlayer: (id: string, name: string, token: string) => void;
  setCurrentWorld: (index: number) => void;
  setPlayerWorld: (world: PlayerWorld) => void;
  setRelations: (relations: Relation[]) => void;
  updateRelation: (npcId: string, fateDelta: number, trustDelta: number) => void;
  setPersonCreated: (created: boolean) => void;
  setCurrency: (gold: number, diamond: number) => void;
  setGlobalFate: (fate: GlobalFate) => void;
  setLevelInfo: (info: LevelInfo | null) => void;
  setCurrentServer: (id: string, name: string) => void;
  clearPlayer: () => void;
}

const SERVER_KEY = 'lunhui.currentServer';

function loadServer(): { id: string; name: string } {
  try {
    const raw = localStorage.getItem(SERVER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.name) return parsed;
    }
  } catch { /* noop */ }
  return { id: '', name: '' };
}

const initialServer = loadServer();

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
  currentServerId: initialServer.id,
  currentServerName: initialServer.name,

  setPlayer: (id, name, token) => set({ playerId: id, playerName: name, token }),
  setCurrentWorld: (index) => set({ currentWorldIndex: index }),
  setPlayerWorld: (world) => set({ playerWorld: world }),
  setRelations: (relations) => set({ relations }),
  setPersonCreated: (created) => set({ personCreated: created }),
  setCurrency: (gold, diamond) => set({ gold, diamond }),
  setGlobalFate: (fate) => set({ globalFate: fate }),
  setLevelInfo: (info) => set({ levelInfo: info }),
  setCurrentServer: (id, name) => {
    try { localStorage.setItem(SERVER_KEY, JSON.stringify({ id, name })); } catch { /* noop */ }
    set({ currentServerId: id, currentServerName: name });
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
