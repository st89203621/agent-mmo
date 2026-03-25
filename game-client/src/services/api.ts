import type { DialogueChoice, NpcInfo, Relation, RelationDetail, BookWorld, MemoryFragment, MemoryHall, ExploreStatus, ExploreEvent, ExploreReward } from '../types';

const BASE_URL = '/api';

interface ApiResponse<T = Record<string, unknown>> {
  code: number;
  data?: T;
  msg?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: ApiResponse<T> = await res.json();
  if (json.code !== 0) throw new Error(json.msg || '请求失败');
  return json.data!;
}

// ── 认证 ──────────────────────────────────────

export function login(username: string, password: string) {
  return request<{ userId: number; username: string; nickname: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function register(username: string, password: string) {
  return request<{ userId: number; username: string; nickname: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function getMe() {
  return request<{ userId: number; username: string }>('/auth/me');
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

// ── 对话 ──────────────────────────────────────

export interface DialogueHistoryItem {
  role: string;
  speaker: string;
  text: string;
  emotion: string;
  choicesJson: string;
}

export interface DialogueData {
  sessionId: string;
  speaker: string;
  emotion: string;
  text: string;
  fateDelta: number;
  trustDelta: number;
  allowFreeInput: boolean;
  choicesJson: string;
  sceneHint?: string;
  resumed?: boolean;
  history?: DialogueHistoryItem[];
}

export function startDialogue(npcId: string, worldIndex: number): Promise<DialogueData> {
  return request('/story/start', {
    method: 'POST',
    body: JSON.stringify({ npcId, worldIndex }),
  });
}

export function sendChoice(sessionId: string, choiceId: number, npcId: string, worldIndex: number): Promise<DialogueData> {
  return request('/story/choice', {
    method: 'POST',
    body: JSON.stringify({ sessionId, choiceId, npcId, worldIndex }),
  });
}

export function sendFreeInput(sessionId: string, text: string, npcId: string, worldIndex: number): Promise<DialogueData> {
  return request('/story/input', {
    method: 'POST',
    body: JSON.stringify({ sessionId, text, npcId, worldIndex }),
  });
}

export function endDialogue(sessionId: string) {
  return request<{ sessionId: string; totalFateDelta: number; totalTrustDelta: number }>('/story/end', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

// ── SSE 流式对话 ──────────────────────────────────────

interface StreamCallbacks {
  onSessionId?: (sessionId: string) => void;
  onChunk: (text: string) => void;
  onComplete: (data: DialogueData) => void;
  onError: (err: Error) => void;
}

function connectSSE(path: string, body: Record<string, unknown>, callbacks: StreamCallbacks): AbortController {
  const ctrl = new AbortController();

  fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    credentials: 'include',
    body: JSON.stringify(body),
    signal: ctrl.signal,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`SSE ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventName = '';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (eventName === 'session') {
            try { callbacks.onSessionId?.(JSON.parse(data).sessionId); } catch {}
          } else if (eventName === 'chunk') {
            callbacks.onChunk(data);
          } else if (eventName === 'complete') {
            try { callbacks.onComplete(JSON.parse(data)); completed = true; } catch (e) {
              callbacks.onError(new Error('响应解析失败'));
            }
          } else if (eventName === 'error') {
            try { callbacks.onError(new Error(JSON.parse(data).msg || '服务器错误')); } catch {
              callbacks.onError(new Error('服务器错误'));
            }
          }
          eventName = '';
        }
      }
    }
    // 流关闭但未收到 complete 事件
    if (!completed) callbacks.onError(new Error('响应流意外终止'));
  }).catch((err) => {
    if (err.name !== 'AbortError') callbacks.onError(err);
  });

  return ctrl;
}

export function streamStartDialogue(
  params: { npcId: string; worldIndex: number },
  callbacks: StreamCallbacks,
): AbortController {
  return connectSSE('/story/stream/start', params, callbacks);
}

export function streamChoice(
  params: { sessionId: string; choiceId: number; npcId: string; worldIndex: number },
  callbacks: StreamCallbacks,
): AbortController {
  return connectSSE('/story/stream/choice', params, callbacks);
}

export function streamFreeInput(
  params: { sessionId: string; text: string; npcId: string; worldIndex: number },
  callbacks: StreamCallbacks,
): AbortController {
  return connectSSE('/story/stream/input', params, callbacks);
}

/** 解析后端返回的choicesJson */
export function parseChoices(choicesJson: string): DialogueChoice[] {
  try {
    const arr = JSON.parse(choicesJson);
    return arr.map((c: { id: number; text: string; fate: number; trust: number }) => ({
      id: c.id,
      text: c.text,
      weight: { fate: c.fate || 0, trust: c.trust || 0 },
    }));
  } catch {
    return [];
  }
}

// ── 场景图片 ──────────────────────────────────────

export function generateSceneImage(npcId: string, worldIndex: number, artStyle?: string, sceneHint?: string): Promise<{ imageId: string; imageUrl: string }> {
  return request('/story/scene-image', {
    method: 'POST',
    body: JSON.stringify({ npcId, worldIndex, artStyle, sceneHint }),
  });
}

// ── NPC ──────────────────────────────────────

export function fetchNpcs(worldIndex = 0, bookTitle?: string): Promise<{ npcs: NpcInfo[] }> {
  let url = `/npc/list?worldIndex=${worldIndex}`;
  if (bookTitle) url += `&bookTitle=${encodeURIComponent(bookTitle)}`;
  return request(url);
}

export function fetchNpcDetail(npcId: string): Promise<NpcInfo> {
  return request(`/story/npc/${npcId}`);
}

// ── 缘分 ──────────────────────────────────────

export function fetchRelations(): Promise<{ relations: Relation[] }> {
  return request('/fate/relations');
}

export function fetchFateMap() {
  return request<{ nodes: Relation[]; totalNpcs: number }>('/fate/map');
}

export function fetchRelationDetail(npcId: string, worldIndex = 0): Promise<RelationDetail> {
  return request(`/fate/relation/${npcId}?worldIndex=${worldIndex}`);
}

// ── 书籍世界 ──────────────────────────────────────

export function fetchBookWorlds(): Promise<{ books: BookWorld[] }> {
  return request('/bookworld/list');
}

export function selectBookWorld(worldIndex: number, bookId: string, customArtStyle?: string) {
  return request('/bookworld/select', {
    method: 'POST',
    body: JSON.stringify({ worldIndex, bookId, customArtStyle }),
  });
}

/** 查询当前已选书籍 */
export interface SelectedBookData {
  bookId: string;
  title: string;
  author: string;
  category: string;
  loreSummary: string;
  artStyle: string;
  colorPalette: string;
  languageStyle: string;
  customArtStyle: string | null;
}

export function fetchSelectedBook(worldIndex: number): Promise<SelectedBookData> {
  return request(`/bookworld/selected?worldIndex=${worldIndex}`);
}

/** 更新自定义图片风格 */
export function updateArtStyle(worldIndex: number, customArtStyle: string) {
  return request('/bookworld/art-style', {
    method: 'POST',
    body: JSON.stringify({ worldIndex, customArtStyle }),
  });
}

/** 从网络爬取书籍并自动提取NPC */
export function addBookFromWeb(title: string) {
  return request<{ book: BookWorld; npcs: NpcInfo[]; msg: string }>('/bookworld/add-from-web', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

// ── 记忆碎片 ──────────────────────────────────────

export function fetchMemories(worldIndex?: number): Promise<{ memories: MemoryFragment[] }> {
  const query = worldIndex !== undefined ? `?worldIndex=${worldIndex}` : '';
  return request(`/memory/list${query}`);
}

export function fetchMemoryHall(): Promise<MemoryHall> {
  return request('/memory/hall');
}

export function unlockMemory(fragmentId: string): Promise<MemoryFragment> {
  return request('/memory/unlock', {
    method: 'POST',
    body: JSON.stringify({ fragmentId }),
  });
}

// ── 装备 ──────────────────────────────────────

export interface EquipData {
  id: string;
  itemTypeId: string;
  position: number;
  level: number;
  quality: number;
  attrTotal: number;
  undistributedAttr: number;
  identifyCount: number;
  fixedProps?: {
    hp: number; mp: number;
    physicsAttack: number; physicsDefense: number;
    magicAttack: number; magicDefense: number;
    speed: number;
  };
  elseProps?: {
    constitution: number; magicPower: number;
    power: number; endurance: number; agile: number;
  };
}

export function fetchEquipList(): Promise<{ equips: EquipData[] }> {
  return request('/equip/list');
}

export function fetchEquipDetail(equipId: string): Promise<EquipData> {
  return request(`/equip/${equipId}`);
}

export function allotEquipAttrs(equipId: string, attrs: Record<string, number>) {
  return request('/equip/allot', {
    method: 'POST',
    body: JSON.stringify({ equipId, ...attrs }),
  });
}

export function identifyEquip(equipId: string): Promise<EquipData> {
  return request('/equip/identify', {
    method: 'POST',
    body: JSON.stringify({ equipId }),
  });
}

export function deleteEquips(ids: string[]) {
  return request('/equip/delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

// ── 背包 ──────────────────────────────────────

export interface BagItemData {
  id: string;
  itemTypeId: string;
  quantity: number;
  name?: string;
  icon?: string;
  description?: string;
  category?: string;
  quality?: string;
}

export function fetchBagItems(): Promise<{ items: BagItemData[] }> {
  return request('/bag/list');
}

export function useBagItem(id: string, itemTypeId: string, quantity = 1) {
  return request('/bag/use', {
    method: 'POST',
    body: JSON.stringify({ id, itemTypeId, quantity }),
  });
}

// ── 轮回 ──────────────────────────────────────

export function fetchRebirthStatus() {
  return request<{
    currentWorldIndex: number;
    totalRebirths: number;
    currentBook: string;
    rebirthPoem: string;
  }>('/rebirth/status');
}

export function selectRebirthBook(bookId: string, bookTitle: string) {
  return request('/rebirth/select-book', {
    method: 'POST',
    body: JSON.stringify({ bookId, bookTitle }),
  });
}

// ── 角色 ──────────────────────────────────────

export interface PersonData {
  exists: boolean;
  id?: number;
  name?: string;
  portraitUrl?: string;
  bgUrl?: string;
  basicProperty?: {
    hp: number; mp: number;
    physicsAttack: number; physicsDefense: number;
    magicAttack: number; magicDefense: number;
    speed: number;
  };
}

export function fetchPersonInfo(): Promise<PersonData> {
  return request('/person/me');
}

export function initPerson(name?: string, gender?: string, features?: string): Promise<{ id: number; name: string }> {
  return request('/person/init', {
    method: 'POST',
    body: JSON.stringify({ name: name || '', gender: gender || '', features: features || '' }),
  });
}

export function generatePortrait(params?: {
  style?: string; gender?: string; features?: string; force?: boolean;
}): Promise<{ portraitUrl: string; bgUrl?: string }> {
  return request('/person/portrait', {
    method: 'POST',
    body: JSON.stringify(params || {}),
  });
}

export type PortraitTarget = 'person' | 'companion' | 'pet';

export function generateSubjectPortrait(params: {
  target: PortraitTarget; targetId?: string; style?: string;
}): Promise<{ portraitUrl: string }> {
  return request('/portrait/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface EditPortraitParams {
  target: PortraitTarget;
  targetId?: string;
  hairstyle?: string;
  expression?: string;
  clothing?: string;
  accessory?: string;
  pose?: string;
  hairColor?: string;
  bodyColor?: string;
  custom?: string;
}

export function editSubjectPortrait(params: EditPortraitParams): Promise<{ portraitUrl: string }> {
  return request('/portrait/edit', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function generateBackground(params?: {
  theme?: string;
}): Promise<{ bgUrl: string }> {
  return request('/person/background', {
    method: 'POST',
    body: JSON.stringify(params || {}),
  });
}

// ── 任务 ──────────────────────────────────────

export interface QuestData {
  questId: string;
  name: string;
  description: string;
  type: number;
  status: number;
  progress: number;
  target: number;
  rewards: string;
  level: number;
}

export function fetchQuests(): Promise<{ quests: QuestData[] }> {
  return request('/quest/list');
}

export function fetchAvailableQuests(level = 1): Promise<{ quests: QuestData[] }> {
  return request(`/quest/available?level=${level}`);
}

export function acceptQuest(questId: string) {
  return request('/quest/accept', {
    method: 'POST',
    body: JSON.stringify({ questId }),
  });
}

export function abandonQuest(questId: string) {
  return request('/quest/abandon', {
    method: 'POST',
    body: JSON.stringify({ questId }),
  });
}

// ── 宠物 ──────────────────────────────────────

export interface PetData {
  id: string;
  petTemplateId: string;
  nickname: string;
  mutationExp: number;
  mutationNo: number;
  propertyPointNum: number;
  constitution: number;
  magicPower: number;
  power: number;
  endurance: number;
  agile: number;
  maxSkill: number;
  aiImageUrl: string;
  petType: string;
  element: string;
  portraitUrl?: string;
}

export interface PetTemplateData {
  id: string;
  name: string;
  description: string;
}

export function fetchPets(): Promise<{ pets: PetData[] }> {
  return request('/pet/list');
}

export function fetchPetTemplates(): Promise<{ templates: PetTemplateData[] }> {
  return request('/pet/templates');
}

export function randomPet(): Promise<{ pet: PetData }> {
  return request('/pet/random', { method: 'POST' });
}

export function createPet(params: {
  petTemplateId?: string; nickname?: string;
  petType?: string; element?: string;
}): Promise<{ pet: PetData }> {
  return request('/pet/create', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function deletePet(petId: string) {
  return request('/pet/delete', {
    method: 'POST',
    body: JSON.stringify({ petId }),
  });
}

// ── 技能 ──────────────────────────────────────

export interface SkillTemplateData {
  id: string;
  name: string;
  description: string;
  branch: string;
  type: string;
  maxLevel: number;
  requiredLevel: number;
  prerequisites: string[] | null;
  costPerLevel: number;
  effectJson?: string;
  icon: string;
  sortOrder: number;
}

export interface PlayerSkillData {
  id: string;
  skillTemplateId: string;
  level: number;
  unlocked: boolean;
}

export function fetchSkillTemplates(): Promise<{ templates: SkillTemplateData[] }> {
  return request('/skill/templates');
}

export function fetchPlayerSkills(): Promise<{ skills: PlayerSkillData[] }> {
  return request('/skill/list');
}

export function unlockSkill(skillTemplateId: string) {
  return request<{ skillTemplateId: string; level: number; unlocked: boolean }>('/skill/unlock', {
    method: 'POST',
    body: JSON.stringify({ skillTemplateId }),
  });
}

export function upgradeSkill(skillTemplateId: string) {
  return request<{ skillTemplateId: string; level: number; unlocked: boolean }>('/skill/upgrade', {
    method: 'POST',
    body: JSON.stringify({ skillTemplateId }),
  });
}

// ── 战斗 ──────────────────────────────────────

export interface BattleUnitData {
  unitId: string;
  name: string;
  unitType: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  speed: number;
  defending: boolean;
}

export interface BattleActionData {
  actorName: string;
  actionType: string;
  targetName: string;
  damage: number;
  heal: number;
  skillName: string;
  description: string;
}

export interface BattleSkillData {
  skillId: string;
  name: string;
  icon: string;
  mpCost: number;
  damageMultiplier: number;
  effectType: string;
}

export interface BattleRewardDetail {
  gold?: number;
  exp?: number;
  dropItem?: string;
  dropIcon?: string;
}

export interface BattleData {
  id: string;
  round: number;
  status: string;
  rewards: string;
  playerUnits: BattleUnitData[];
  enemyUnits: BattleUnitData[];
  actionLog: BattleActionData[];
  availableSkills: BattleSkillData[];
  rewardDetail?: BattleRewardDetail;
}

export function startBattle(stats: Record<string, number>): Promise<{ battle: BattleData }> {
  return request('/battle/start', {
    method: 'POST',
    body: JSON.stringify(stats),
  });
}

export function getBattleState(): Promise<{ battle: BattleData }> {
  return request('/battle/state');
}

export function battleAction(actionType: string, targetId?: string, skillId?: string): Promise<{ battle: BattleData }> {
  return request('/battle/action', {
    method: 'POST',
    body: JSON.stringify({ actionType, targetId, skillId }),
  });
}

// ── 商城 ──────────────────────────────────────

export interface ShopItemData {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  quality: string;
  isHot: boolean;
  stock: number;
}

export function fetchShopItems(category?: string): Promise<{ items: ShopItemData[] }> {
  const query = category ? `?category=${category}` : '';
  return request(`/shop/list${query}`);
}

export function fetchPlayerCurrency(): Promise<{ gold: number; diamond: number }> {
  return request('/shop/currency');
}

export function purchaseItem(itemId: string, quantity = 1) {
  return request<Record<string, unknown>>('/shop/purchase', {
    method: 'POST',
    body: JSON.stringify({ itemId, quantity }),
  });
}

// ── 附魔 ──────────────────────────────────────

export interface EnchantData {
  equipId: string;
  enchantLevel: number;
  totalAttributeBonus: number;
  guaranteeCount: number;
  attributeBonusPercent: number;
}

export function fetchEnchantInfo(equipId: string): Promise<EnchantData> {
  return request(`/enchant/${equipId}`);
}

export function applyEnchant(equipId: string, runeLevel: number): Promise<EnchantData> {
  return request('/enchant/apply', {
    method: 'POST',
    body: JSON.stringify({ equipId, runeLevel }),
  });
}

// ── 副本 ──────────────────────────────────────

export interface DungeonData {
  id: string;
  dungeonId: string;
  dungeonName: string;
  type: string;
  currentStage: number;
  maxStage: number;
  status: string;
  difficulty: number;
  firstClear: boolean;
  clearCount: number;
}

export function fetchDungeons(): Promise<{ dungeons: DungeonData[] }> {
  return request('/dungeon/list');
}

export function enterDungeon(dungeonId: string, difficulty = 1): Promise<{ dungeon: DungeonData }> {
  return request('/dungeon/enter', {
    method: 'POST',
    body: JSON.stringify({ dungeonId, difficulty }),
  });
}

export function completeDungeonStage(dungeonId: string, stageId: number, stars = 3): Promise<{ dungeon: DungeonData }> {
  return request('/dungeon/complete-stage', {
    method: 'POST',
    body: JSON.stringify({ dungeonId, stageId, stars }),
  });
}

export function exitDungeon(dungeonId: string): Promise<{ dungeon: DungeonData }> {
  return request('/dungeon/exit', {
    method: 'POST',
    body: JSON.stringify({ dungeonId }),
  });
}

// ── 图鉴 ──────────────────────────────────────

export interface CodexNpcData {
  npcId: string;
  npcName: string;
  personality: string;
  role: string;
  unlocked: boolean;
}

export interface CodexEquipData {
  itemTypeId: string;
  level: number;
  quality: number;
}

export interface CodexPetData {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export function fetchCodexNpc(): Promise<{ npcs: CodexNpcData[]; total: number; unlocked: number }> {
  return request('/codex/npc');
}

export function fetchCodexEquip(): Promise<{ equips: CodexEquipData[]; totalTypes: number }> {
  return request('/codex/equip');
}

export function fetchCodexPet(): Promise<{ pets: CodexPetData[]; total: number; unlocked: number }> {
  return request('/codex/pet');
}

// ── 排行榜 ──────────────────────────────────────

export interface RankEntryData {
  rank: number;
  playerId: number;
  playerName: string;
  level: number;
  value: number;
}

export function fetchRankList(type = 'level', limit = 20): Promise<{ entries: RankEntryData[]; myRank: number }> {
  return request(`/rank/list?type=${type}&limit=${limit}`);
}

// ── 灵侣 ──────────────────────────────────────

export interface CompanionData {
  id: string;
  name: string;
  realm: string;
  type: string;
  quality: string;
  level: number;
  bondLevel: number;
  atk: number;
  def: number;
  spd: number;
  currentHp: number;
  maxHp: number;
  portraitUrl?: string;
}

export function fetchCompanions(): Promise<{ companions: CompanionData[] }> {
  return request('/companion/list');
}

// ── 探索 ──────────────────────────────────────

export function fetchExploreStatus(): Promise<ExploreStatus> {
  return request('/explore/status');
}

export function exploreAction(worldIndex: number, bookTitle: string): Promise<{ event: ExploreEvent }> {
  return request('/explore/action', {
    method: 'POST',
    body: JSON.stringify({ worldIndex, bookTitle }),
  });
}

export function resolveExploreChoice(eventId: string, choiceId: number): Promise<ExploreReward> {
  return request('/explore/resolve', {
    method: 'POST',
    body: JSON.stringify({ eventId, choiceId }),
  });
}

export function fetchExploreHistory(): Promise<{ events: ExploreEvent[] }> {
  return request('/explore/history');
}

export function startExploreCombat(eventId: string, enemyName: string): Promise<{ battle: BattleData }> {
  return request('/explore/start-combat', {
    method: 'POST',
    body: JSON.stringify({ eventId, enemyName }),
  });
}

export function resolveExploreCombat(eventId: string): Promise<ExploreReward> {
  return request('/explore/resolve-combat', {
    method: 'POST',
    body: JSON.stringify({ eventId }),
  });
}

// ── 签到 ──────────────────────────────────────

export function fetchCheckinStatus(): Promise<{
  todayChecked: boolean;
  consecutiveDays: number;
  totalDays: number;
}> {
  return request('/checkin/status');
}

export function doCheckin(): Promise<{
  todayChecked: boolean;
  consecutiveDays: number;
  totalDays: number;
  reward: string;
}> {
  return request('/checkin/do', { method: 'POST' });
}

// ── 成就 ──────────────────────────────────────

export interface AchievementData {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  reward: string;
  unlockedAt: string | null;
}

export function fetchAchievements(): Promise<{
  achievements: AchievementData[];
  totalUnlocked: number;
  totalCount: number;
}> {
  return request('/achievement/list');
}

export function claimAchievementReward(achievementId: string): Promise<{ reward: string }> {
  return request('/achievement/claim', {
    method: 'POST',
    body: JSON.stringify({ achievementId }),
  });
}

// ── 灵侣增强 ──────────────────────────────────────

export function feedCompanion(companionId: string): Promise<CompanionData> {
  return request('/companion/feed', {
    method: 'POST',
    body: JSON.stringify({ companionId }),
  });
}

export function setCompanionActive(companionId: string): Promise<{ success: boolean }> {
  return request('/companion/set-active', {
    method: 'POST',
    body: JSON.stringify({ companionId }),
  });
}

export function fetchCompanionSkills(companionId: string): Promise<{
  skills: { name: string; description: string; level: number; icon: string }[];
}> {
  return request(`/companion/${companionId}/skills`);
}
