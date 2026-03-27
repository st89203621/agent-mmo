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

  setPlayer: (id: string, name: string, token: string) => void;
  setCurrentWorld: (index: number) => void;
  setPlayerWorld: (world: PlayerWorld) => void;
  setRelations: (relations: Relation[]) => void;
  updateRelation: (npcId: string, fateDelta: number, trustDelta: number) => void;
  setPersonCreated: (created: boolean) => void;
  setCurrency: (gold: number, diamond: number) => void;
  setGlobalFate: (fate: GlobalFate) => void;
  clearPlayer: () => void;
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

  setPlayer: (id, name, token) => set({ playerId: id, playerName: name, token }),
  setCurrentWorld: (index) => set({ currentWorldIndex: index }),
  setPlayerWorld: (world) => set({ playerWorld: world }),
  setRelations: (relations) => set({ relations }),
  setPersonCreated: (created) => set({ personCreated: created }),
  setCurrency: (gold, diamond) => set({ gold, diamond }),
  setGlobalFate: (fate) => set({ globalFate: fate }),
  clearPlayer: () => set({
    playerId: '', playerName: '', token: '', currentWorldIndex: 0,
    playerWorld: null, relations: [], equipment: [], pets: [],
    personCreated: false, gold: 0, diamond: 0, globalFate: null,
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
