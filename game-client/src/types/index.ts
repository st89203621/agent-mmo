/** 12种情绪类型 */
export type Emotion =
  | 'calm' | 'happy' | 'sad' | 'angry'
  | 'shy' | 'surprised' | 'tender' | 'cold'
  | 'fearful' | 'determined' | 'melancholy' | 'playful';

/** AI对话选项 */
export interface DialogueChoice {
  id: number;
  text: string;
  weight: { fate: number; trust: number };
}

/** 对话消息（前端渲染用） */
export interface DialogueMessage {
  sessionId: string;
  speaker: string;
  emotion: Emotion;
  text: string;
  choices: DialogueChoice[];
  allowFreeInput: boolean;
  fateDelta: number;
  trustDelta: number;
  isStreaming?: boolean;
  isPlayer?: boolean;
}

/** NPC信息 */
export interface NpcInfo {
  npcId: string;
  npcName: string;
  bookTitle: string;
  personality: string;
  role: string;
  emotion: Emotion;
  portraitBase: string;
  gender: string;
  age: string;
  features: string;
}

/** 缘分关系 */
export interface Relation {
  relationId: string;
  playerId: string;
  npcId: string;
  npcName: string;
  fateScore: number;
  trustScore: number;
  lastEmotion: Emotion;
  imageUrl: string;
  keyFacts: string[];
  worldIndex: number;
  lastInteractTime: number;
  milestone: number;
}

/** 书籍世界 */
export interface BookWorld {
  id: string;
  title: string;
  author: string;
  category: string;
  loreSummary: string;
  artStyle: string;
  colorPalette: string;
  languageStyle: string;
  coverUrl: string;
}

/** 记忆碎片 */
export interface MemoryFragment {
  id: string;
  npcId: string;
  npcName: string;
  worldIndex: number;
  title: string;
  excerpt: string;
  fateScore: number;
  locked: boolean;
  emotionTone: Emotion;
  bookTitle: string;
  createTime: number;
  unlockCondition: string | null;
  imageUrl: string | null;
  affectsNextWorld: boolean;
}

/** 记忆馆统计 */
export interface MemoryHall {
  totalFragments: number;
  unlockedFragments: number;
  worldStats: Record<number, number>;
}

/** 缘分关系详情（含NPC模板+记忆） */
export interface RelationDetail extends Relation {
  personality: string;
  role: string;
  gender: string;
  age: string;
  features: string;
  bookTitle: string;
  memories: MemoryFragment[];
}

/** 玩家世界状态 */
export interface PlayerWorld {
  playerId: string;
  currentWorldIndex: number;
  worlds: WorldRecord[];
}

export interface WorldRecord {
  worldIndex: number;
  bookTitle: string;
  status: 'CURRENT' | 'COMPLETED' | 'PENDING';
  poem: string;
}

/** 装备槽位 */
export type EquipSlot = 'weapon' | 'armor' | 'accessory' | 'mount' | 'pet_egg';

/** 装备 */
export interface Equipment {
  id: string;
  name: string;
  slot: EquipSlot;
  quality: string;
  story: string;
  primaryStat: string;
  statValue: number;
  enchantSlots: number;
  worldIndex: number;
}

/** 宠物 */
export interface Pet {
  id: string;
  name: string;
  type: string;
  level: number;
  affection: number;
  portraitUrl: string;
  worldOrigin: number;
  skills: string[];
}

/** 探索状态 */
export interface ExploreStatus {
  actionPoints: number;
  maxPoints: number;
  nextRecoverSec: number;
  todayCount: number;
}

/** 探索事件 */
export type ExploreEventType = 'encounter' | 'discovery' | 'lore' | 'dilemma' | 'vista' | 'combat';

export interface ExploreEventChoice {
  id: number;
  text: string;
  risk: 'low' | 'medium' | 'high';
}

export interface ExploreEvent {
  eventId: string;
  type: ExploreEventType;
  title: string;
  description: string;
  choices: ExploreEventChoice[];
  npcId: string | null;
  sceneHint: string | null;
  enemyName: string | null;
  battleId: string | null;
}

/** 探索奖励 */
export interface ExploreReward {
  message: string;
  fateDelta: number;
  trustDelta: number;
  itemName: string | null;
  memoryTitle: string | null;
  imageUrl: string | null;
}

/** 页面ID枚举 */
export type PageId =
  | 'home' | 'story' | 'battle' | 'explore' | 'memory' | 'rebirth'
  | 'character' | 'equip-detail' | 'enchant' | 'skill-tree'
  | 'inventory' | 'pet' | 'pet-summon' | 'book-world'
  | 'dungeon' | 'codex' | 'char-create' | 'achievement' | 'quest' | 'shop'
  | 'companion';
