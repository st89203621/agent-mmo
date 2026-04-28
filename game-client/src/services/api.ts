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

// ── 分区 ──────────────────────────────────────

export interface ServerInfo {
  id: string;
  name: string;
  status: string;
  newServer: boolean;
  recommended: boolean;
  online: number;
}

export function fetchServerList(): Promise<{ servers: ServerInfo[]; current: string }> {
  return request('/server/list');
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

export function generateSceneImage(npcId: string, worldIndex: number, artStyle?: string, sceneHint?: string, width?: number, height?: number): Promise<{ imageId: string; imageUrl: string }> {
  return request('/story/scene-image', {
    method: 'POST',
    body: JSON.stringify({ npcId, worldIndex, artStyle, sceneHint, width: width || 1024, height: height || 1024 }),
  });
}

export type VisualAssetType = 'scene' | 'portrait' | 'monster' | 'icon' | 'banner';

export interface VisualAssetRequest {
  assetKey: string;
  type: VisualAssetType;
  name: string;
  description?: string;
  context?: string;
  width?: number;
  height?: number;
  force?: boolean;
}

export interface VisualAssetResponse {
  assetKey: string;
  imageId?: string;
  imageUrl: string;
  prompt?: string;
}

export function fetchVisualAsset(assetKey: string, width = 768, height = 512): Promise<VisualAssetResponse> {
  const params = new URLSearchParams({ assetKey, width: String(width), height: String(height) });
  return request<VisualAssetResponse>(`/visual-asset?${params}`).catch(() => ({
    assetKey,
    imageUrl: '',
  }));
}

export function generateVisualAsset(params: VisualAssetRequest): Promise<VisualAssetResponse> {
  return request<VisualAssetResponse>('/visual-asset/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(async () => {
    const prompt = buildVisualAssetFallbackPrompt(params);
    const npcId = params.type === 'scene' || params.type === 'banner'
      ? `explore_bg_${params.assetKey}`
      : `visual_${params.type}_${params.assetKey}`;
    const result = await generateSceneImage(
      params.force ? `${npcId}_${Date.now()}` : npcId,
      0,
      prompt,
      `${params.name}。${params.description || ''}。${params.context || ''}`,
      params.width || 832,
      params.height || 512,
    );
    return {
      assetKey: params.assetKey,
      imageId: result.imageId,
      imageUrl: result.imageUrl,
      prompt,
    };
  });
}

function buildVisualAssetFallbackPrompt(params: VisualAssetRequest) {
  const styleCtx = params.context ? `${params.context}，` : '';
  const base = `8K超高清东方仙侠游戏插画，${styleCtx}焦点清晰，主体锐利，细节丰富，清新淡雅，色彩丰富明亮，柔光通透，唯美工笔国风，画面干净，禁止暗沉厚重，禁止柔焦糊片，禁止文字、禁止水印、禁止logo、禁止UI按钮，`;
  const subject = `名称：${params.name}，设定：${params.description || ''}。`;
  if (params.type === 'icon') return `${base}${subject}单个游戏图标，主体居中，描边锐利，浅色光泽底，适合小尺寸识别。`;
  if (params.type === 'monster') return `${base}${subject}单体灵兽全身立绘，主体占画面75%，神态灵动飘逸，轮廓清晰，明亮虚化柔色背景。`;
  if (params.type === 'portrait') return `${base}${subject}半身人物立绘，人物占画面70%，古风轻盈服饰，五官清晰，柔光通透，浅色虚化背景带细腻光斑。`;
  if (params.type === 'banner') return `${base}${subject}横幅插画，宽屏构图，左右留空，色彩缤纷柔和，主体锐利，不含文字。`;
  return `${base}${subject}纯场景背景图，无人物，前中远景层次分明，纹理清晰，柔和光影，明亮通透，适合移动端H5页面顶部。`;
}

// ── NPC ──────────────────────────────────────

export function fetchNpcs(worldIndex = 0, bookTitle?: string): Promise<{ npcs: NpcInfo[] }> {
  let url = `/npc/list?worldIndex=${worldIndex}&_t=${Date.now()}`;
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
  name?: string;
  icon?: string;
  position: number;
  level: number;
  quality: number;
  grade: number;
  furnaceGrade: number;
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

export function randomEquipDrop(maxQuality = 'epic'): Promise<EquipData> {
  return request('/equip/random', {
    method: 'POST',
    body: JSON.stringify({ maxQuality }),
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
  equipId?: string;
  equipPosition?: number;
  effectType?: string;
}

export interface BagCapacity {
  used: number;
  max: number;
}

export function fetchBagItems(): Promise<{ items: BagItemData[]; capacity?: BagCapacity }> {
  return request('/bag/list');
}

export interface BagUseResult {
  msg: string;
  expGained?: number;
  levelsGained?: number;
  currentLevel?: number;
  currentExp?: number;
  maxExp?: number;
}

export function useBagItem(id: string, itemTypeId: string, quantity = 1): Promise<BagUseResult> {
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
  profession?: string;
  portraitUrl?: string;
  bgUrl?: string;
  basicProperty?: {
    hp: number; mp: number;
    physicsAttack: number; physicsDefense: number;
    magicAttack: number; magicDefense: number;
    speed: number;
    bonusAttack: number; bonusDefense: number;
    agility: number; critRate: number;
  };
  level?: {
    level: number;
    exp: number;
    maxExp: number;
  };
  attributePoints?: number;
}

export function fetchPersonInfo(): Promise<PersonData> {
  return request('/person/me');
}

export function allotPersonPoints(attrs: Record<string, number>): Promise<{ attributePoints: number; msg: string }> {
  return request('/person/allot-points', {
    method: 'POST',
    body: JSON.stringify(attrs),
  });
}

export function resetPersonPoints(): Promise<{ attributePoints: number; refunded: number; msg: string }> {
  return request('/person/reset-points', { method: 'POST' });
}


export function initPerson(name?: string, gender?: string, features?: string, profession?: string): Promise<{ id: number; name: string; profession: string }> {
  return request('/person/init', {
    method: 'POST',
    body: JSON.stringify({ name: name || '', gender: gender || '', features: features || '', profession: profession || 'ATTACK' }),
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
  tier: number;
  tierName: string;
  icon: string;
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
  portraitUrl?: string;
  grade?: string;
  actionGauge?: number;
}

export interface BattleActionData {
  actorName: string;
  actorId: string;
  actionType: string;
  targetId: string;
  targetName: string;
  effectType: string;
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
  currentLevel?: number;
  currentExp?: number;
  maxExp?: number;
  dropItem?: string;
  dropIcon?: string;
  equipDrop?: string;
  equipDropIcon?: string;
  equipDropId?: string;
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

export interface BattleStartParams {
  zoneId?: string;
  zoneName?: string;
  monsterId?: string;
  monsterName?: string;
  monsterLevel?: number;
  dungeonId?: string;
  questId?: string;
  source?: string;
}

export function startBattle(params?: BattleStartParams): Promise<{ battle: BattleData }> {
  return request('/battle/start', {
    method: 'POST',
    body: params ? JSON.stringify(params) : undefined,
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
  attributes?: Record<string, number>;
  equipPosition?: number;
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

export function prestigeEnchant(equipId: string): Promise<EnchantData> {
  return request('/enchant/prestige', {
    method: 'POST',
    body: JSON.stringify({ equipId }),
  });
}

// ── 装备加品 ──────────────────────────────────────

export function upgradeEquipGrade(equipId: string): Promise<{ equipId: string; grade: number; attrTotal: number; success: boolean }> {
  return request('/equip/upgrade-grade', {
    method: 'POST',
    body: JSON.stringify({ equipId }),
  });
}

export function furnaceUpgrade(equipId: string): Promise<{ equipId: string; furnaceGrade: number; attrTotal: number; success: boolean }> {
  return request('/equip/furnace-upgrade', {
    method: 'POST',
    body: JSON.stringify({ equipId }),
  });
}

// ── 场景穿梭 ──────────────────────────────────────

export interface GameSceneData {
  sceneId: string;
  name: string;
  description: string;
  requiredLevel: number;
  order: number;
  unlocked: boolean;
}

export function fetchScenes(): Promise<{ scenes: GameSceneData[]; playerLevel: number }> {
  return request('/scene/list');
}

export function enterScene(sceneId: string): Promise<{ sceneId: string; name: string; entered: boolean }> {
  return request('/scene/enter', {
    method: 'POST',
    body: JSON.stringify({ sceneId }),
  });
}

// ── 宝山 ──────────────────────────────────────

export interface MountainData {
  mountainType: string;
  name: string;
  description: string;
  requiredGuildLevel: number;
  maxDigTimes: number;
}

export interface MountainStatusData {
  mountainType: string;
  digCount: number;
  totalReward: number;
  dateTag: number;
}

export interface DigResult {
  success: boolean;
  reward: number;
  rewardType: string;
  digCount: number;
  maxDigTimes: number;
  totalReward: number;
  message: string;
}

export function fetchMountains(): Promise<{ mountains: MountainData[] }> {
  return request('/treasure/list');
}

export function fetchMountainStatus(mountainType: string): Promise<MountainStatusData> {
  return request(`/treasure/status?mountainType=${mountainType}`);
}

export function digMountain(mountainType: string): Promise<DigResult> {
  return request('/treasure/dig', {
    method: 'POST',
    body: JSON.stringify({ mountainType }),
  });
}

// ── 副本 ──────────────────────────────────────

export interface StageInfoData {
  stageId: number;
  stageName: string;
  enemyName: string;
  enemyLevel: number;
  isBoss: boolean;
  reward?: { gold: number; exp: number };
}

export interface StageProgressData {
  stageId: number;
  completed: boolean;
  stars: number;
}

export interface DungeonData {
  id: string;
  dungeonId: string;
  dungeonName: string;
  description: string;
  type: string;
  currentStage: number;
  maxStage: number;
  status: string;
  difficulty: number;
  recommendedLevel: number;
  dailyLimit: number;
  dailyRemaining: number;
  firstClear: boolean;
  clearCount: number;
  bestTime: number;
  stages: StageInfoData[];
  stageProgress: StageProgressData[];
  firstClearReward?: { gold: number; exp: number; title: string };
}

export interface DungeonRewardResult {
  gold: number;
  exp: number;
  items: { itemName: string; quantity: number; rarity: string }[];
  title?: string;
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

export function challengeDungeonStage(dungeonId: string): Promise<{ battle: BattleData; stageInfo: StageInfoData; dungeonId: string }> {
  return request('/dungeon/challenge', {
    method: 'POST',
    body: JSON.stringify({ dungeonId }),
  });
}

export function settleDungeonStage(dungeonId: string, stars = 3): Promise<{
  dungeon: DungeonData;
  stageReward: DungeonRewardResult;
  clearReward?: DungeonRewardResult;
  firstClearReward?: DungeonRewardResult;
}> {
  return request('/dungeon/settle', {
    method: 'POST',
    body: JSON.stringify({ dungeonId, stars }),
  });
}

export function failDungeonStage(dungeonId: string): Promise<{ dungeon: DungeonData }> {
  return request('/dungeon/fail', {
    method: 'POST',
    body: JSON.stringify({ dungeonId }),
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

// ── 聊天 ──────────────────────────────────────

export interface ChatMessageData {
  messageId: string;
  senderId: number;
  senderName: string;
  receiverId: number;
  content: string;
  /** 1-世界 2-私聊 3-盟会 */
  chatType: number;
  timestamp: number;
}

export function fetchChatHistory(chatType: number, limit = 50): Promise<{ messages: ChatMessageData[] }> {
  return request(`/chat/history?chatType=${chatType}&limit=${limit}`);
}

export function fetchPrivateChat(targetId: number, limit = 50): Promise<{ messages: ChatMessageData[] }> {
  return request(`/chat/private/${targetId}?limit=${limit}`);
}

export function sendChatMessage(content: string, chatType: number, receiverId = 0): Promise<ChatMessageData> {
  return request('/chat/send', {
    method: 'POST',
    body: JSON.stringify({ content, chatType, receiverId }),
  });
}

// ── 称号 ──────────────────────────────────────

export interface TitleBonus {
  atk: number; def: number; hp: number;
  magicAtk: number; extraAtk: number; extraDef: number; agility: number;
}

export interface TitleData {
  titleId: string;
  name: string;
  titleType: string;
  requiredLevel: number;
  description: string;
  equipped: boolean;
  bonus: TitleBonus;
}

export function fetchMyTitles(): Promise<{ titles: TitleData[]; equippedId: string }> {
  return request('/title/list');
}

export function fetchAvailableTitles(): Promise<{ titles: TitleData[] }> {
  return request('/title/available');
}

export function equipTitle(titleId: string): Promise<{ success: boolean }> {
  return request('/title/equip', {
    method: 'POST',
    body: JSON.stringify({ titleId }),
  });
}

export function unequipTitle(): Promise<{ success: boolean }> {
  return request('/title/unequip', { method: 'POST' });
}

export function grantTitle(titleId: string): Promise<{ success: boolean }> {
  return request('/title/grant', {
    method: 'POST',
    body: JSON.stringify({ titleId }),
  });
}

// ── 盟会 ──────────────────────────────────────

export interface GuildData {
  hasGuild?: boolean;
  guildId: string;
  name: string;
  leaderId: number;
  leaderName: string;
  memberCount: number;
  maxMembers: number;
  level: number;
  notice: string;
  totalConstruction: number;
  totalHonor: number;
  createTime?: number;
  myPosition?: string;
  myContribution?: number;
  myConstruction?: number;
  myHonor?: number;
}

export interface GuildMemberData {
  playerId: number;
  playerName: string;
  position: string;
  contribution: number;
  construction: number;
  honor: number;
  joinTime: number;
}

export function fetchMyGuild(): Promise<GuildData> {
  return request('/guild/my');
}

export function fetchGuildList(): Promise<{ guilds: GuildData[] }> {
  return request('/guild/list');
}

export function fetchGuildMembers(): Promise<{ members: GuildMemberData[] }> {
  return request('/guild/members');
}

export function createGuild(name: string): Promise<{ success: boolean; guildId: string }> {
  return request('/guild/create', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function joinGuild(guildId: string): Promise<{ success: boolean }> {
  return request('/guild/join', {
    method: 'POST',
    body: JSON.stringify({ guildId }),
  });
}

export function leaveGuild(): Promise<{ success: boolean }> {
  return request('/guild/leave', { method: 'POST' });
}

export function dissolveGuild(): Promise<{ success: boolean }> {
  return request('/guild/dissolve', { method: 'POST' });
}

export function donateGold(amount: number): Promise<{ success: boolean }> {
  return request('/guild/donate-gold', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export function kickGuildMember(targetId: number): Promise<{ success: boolean }> {
  return request('/guild/kick', {
    method: 'POST',
    body: JSON.stringify({ targetId }),
  });
}

// ── 全局缘值/信值 ──────────────────────────────────────

export interface GlobalFateData {
  totalFate: number;
  totalTrust: number;
  currentFate: number;
  currentTrust: number;
  fateGrade: string;
  worldIndex: number;
}

export function fetchGlobalFate(): Promise<GlobalFateData> {
  return request('/fate/global');
}

// ── 情花系统 ──────────────────────────────────────

export interface FlowerData {
  playerId: number;
  flowerName: string;
  stage: string;
  color: string;
  totalFateWatered: number;
  totalTrustInfused: number;
  flowerVerse: string;
  worldCount: number;
  bloomed: boolean;
}

export function fetchFlower(): Promise<FlowerData> {
  return request('/flower/get');
}

export function waterFlower(fateAmount: number, trustAmount: number): Promise<FlowerData> {
  return request('/flower/water', {
    method: 'POST',
    body: JSON.stringify({ fateAmount, trustAmount }),
  });
}

// ── 玩家交易 ──────────────────────────────────────

export interface TradeData {
  tradeId: string;
  sellerId: number;
  sellerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  currency: string;
  createTime: number;
  status: string;
}

export function fetchOpenTrades(): Promise<{ trades: TradeData[] }> {
  return request('/trade/list');
}

export function createTrade(itemId: string, quantity: number, price: number, currency: string): Promise<TradeData> {
  return request('/trade/create', {
    method: 'POST',
    body: JSON.stringify({ itemId, quantity, price, currency }),
  });
}

export function acceptTrade(tradeId: string): Promise<TradeData> {
  return request('/trade/accept', {
    method: 'POST',
    body: JSON.stringify({ tradeId }),
  });
}

export function cancelTrade(tradeId: string): Promise<TradeData> {
  return request('/trade/cancel', {
    method: 'POST',
    body: JSON.stringify({ tradeId }),
  });
}

export function fetchMyTrades(): Promise<{ trades: TradeData[] }> {
  return request('/trade/my');
}

// ── 组队PvP ──────────────────────────────────────

export interface TeamData {
  teamId: string;
  leaderId: number;
  leaderName: string;
  memberIds: string;
  memberNames: string;
  teamSize: number;
  status: string;
  totalPower: number;
}

export interface TeamBattleResultData {
  battleId: string;
  victory: boolean;
  fateReward: number;
  trustReward: number;
  mvpPlayerName: string;
  ratingChange: number;
}

export function createTeam(): Promise<TeamData> {
  return request('/team-battle/create', { method: 'POST' });
}

export function joinTeam(teamId: string): Promise<TeamData> {
  return request('/team-battle/join', {
    method: 'POST',
    body: JSON.stringify({ teamId }),
  });
}

export function leaveTeam(teamId: string): Promise<TeamData> {
  return request('/team-battle/leave', {
    method: 'POST',
    body: JSON.stringify({ teamId }),
  });
}

export function getTeamInfo(teamId: string): Promise<TeamData> {
  return request(`/team-battle/info?teamId=${teamId}`);
}

// ── 记忆激活 ──────────────────────────────────────

export function activateMemory(fragmentId: string): Promise<MemoryFragment> {
  return request('/memory/activate', {
    method: 'POST',
    body: JSON.stringify({ fragmentId }),
  });
}

export function fetchActivatedBonuses(): Promise<Record<string, number>> {
  return request('/memory/bonuses');
}

// ── 共探书境 ──────────────────────────────────────

import type { CoexploreSessionData } from '../types';

export function createCoexplore(book: { bookTitle: string; bookLoreSummary: string; bookArtStyle: string }): Promise<CoexploreSessionData> {
  return request('/coexplore/create', {
    method: 'POST',
    body: JSON.stringify(book),
  });
}

export function joinCoexplore(sessionId: string): Promise<CoexploreSessionData> {
  return request('/coexplore/join', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

// ── 区域/地图 ──────────────────────────────────────

import type {
  ZoneInfo,
  NearbyPlayer,
  AuctionItem,
  MarketListing,
  BoardMessage,
  RankingEntry,
  FriendProfile,
  MailItem,
} from '../types';

export function fetchCurrentZone(): Promise<ZoneInfo> {
  return request('/zone/current');
}

export function moveToZone(zoneId: string): Promise<ZoneInfo> {
  return request('/zone/move', {
    method: 'POST',
    body: JSON.stringify({ zoneId }),
  });
}

export function teleportToZone(zoneId: string): Promise<ZoneInfo> {
  return request('/zone/teleport', {
    method: 'POST',
    body: JSON.stringify({ zoneId }),
  });
}

export function fetchNearbyPlayers(): Promise<{ players: NearbyPlayer[] }> {
  return request('/zone/nearby-players');
}

// ── 拍卖行 ──────────────────────────────────────

export function fetchAuctionList(tab: 'active' | 'ended' | 'mybids' | 'mysales', page = 0): Promise<{ items: AuctionItem[]; total: number }> {
  return request(`/auction/list?tab=${tab}&page=${page}`);
}

export function placeBid(auctionId: string, amount: number): Promise<{ success: boolean; currentBid: number }> {
  return request('/auction/bid', {
    method: 'POST',
    body: JSON.stringify({ auctionId, amount }),
  });
}

export function buyNow(auctionId: string): Promise<{ success: boolean }> {
  return request('/auction/buy-now', {
    method: 'POST',
    body: JSON.stringify({ auctionId }),
  });
}

export function listItemOnAuction(params: {
  itemId: string;
  startPrice: number;
  buyNowPrice?: number;
  durationHours: number;
}): Promise<{ auctionId: string }> {
  return request('/auction/list-item', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function cancelAuctionListing(auctionId: string): Promise<{ success: boolean }> {
  return request('/auction/cancel', {
    method: 'POST',
    body: JSON.stringify({ auctionId }),
  });
}

// ── 集市（玩家挂单） ──────────────────────────────────────

export function fetchMarketItems(category?: string, keyword?: string, page = 0): Promise<{ items: MarketListing[]; total: number }> {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set('category', category);
  if (keyword) params.set('keyword', keyword);
  return request(`/market/list?${params}`);
}

export function sellOnMarket(itemId: string, price: number, quantity: number): Promise<{ listingId: string }> {
  return request('/market/sell', {
    method: 'POST',
    body: JSON.stringify({ itemId, price, quantity }),
  });
}

export function buyFromMarket(listingId: string, quantity = 1): Promise<{ success: boolean }> {
  return request('/market/buy', {
    method: 'POST',
    body: JSON.stringify({ listingId, quantity }),
  });
}

export function fetchMyMarketListings(): Promise<{ items: MarketListing[] }> {
  return request('/market/my-listings');
}

export function cancelMarketListing(listingId: string): Promise<{ success: boolean }> {
  return request('/market/cancel', {
    method: 'POST',
    body: JSON.stringify({ listingId }),
  });
}

// ── 婚介/婚姻 ──────────────────────────────────────

export function fetchMarriageStatus(): Promise<{
  isMarried: boolean; spouseId?: number; spouseName?: string;
  spousePortraitUrl?: string; marriageDate?: number; buffDescription?: string;
}> {
  return request<{
    married: boolean;
    partner?: { partnerId: number; partnerName: string; createdAt: number };
  }>('/marriage/status').then((data) => ({
    isMarried: !!data.married,
    spouseId: data.partner?.partnerId,
    spouseName: data.partner?.partnerName,
    marriageDate: data.partner?.createdAt,
    buffDescription: data.married ? '夫妻同心 · 经验加成 +5%' : undefined,
  }));
}

export function fetchMatchmakingList(): Promise<{
  candidates: { playerId: number; name: string; level: number; fateScore: number; portraitUrl?: string }[];
}> {
  return request<{ candidates: { playerId: number; name: string; level: number; intro?: string; portraitUrl?: string }[] }>('/marriage/matchmaking')
    .then((data) => ({
      candidates: (data.candidates || []).map((item, index) => ({
        ...item,
        fateScore: Math.max(55, 92 - index * 11),
      })),
    }));
}

export function proposeMarriage(targetPlayerId: number): Promise<{ success: boolean; msg: string }> {
  return request('/marriage/propose', {
    method: 'POST',
    body: JSON.stringify({ targetPlayerId }),
  });
}

export function divorce(): Promise<{ success: boolean }> {
  return request('/marriage/divorce', { method: 'POST' });
}

// ── 留言板 ──────────────────────────────────────

export function fetchMessageBoard(zoneId?: string): Promise<{ messages: BoardMessage[] }> {
  const q = zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : '';
  return request(`/message-board/list${q}`);
}

export function postBoardMessage(
  content: string,
  zoneId?: string,
  type: 'user' | 'ad' | 'trade' = 'user',
): Promise<BoardMessage> {
  return request('/message-board/post', {
    method: 'POST',
    body: JSON.stringify({ content, zoneId, type }),
  });
}

// ── VIP ──────────────────────────────────────

export interface VipBenefit {
  key: string;
  name: string;
  unlockLevel: number;
}

export interface VipMilestone {
  level: number;
  cost: number;
  reward: string;
}

export interface VipInfo {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  benefits: VipBenefit[];
  milestones: VipMilestone[];
  monthlyCardActive: boolean;
  monthlyCardExpireAt: number;
}

export function fetchVipInfo(): Promise<VipInfo> {
  return request('/vip/info');
}

// ── 玩友 / 邮件 ──────────────────────────────────────

export function fetchFriends(): Promise<{ friends: FriendProfile[] }> {
  return request('/friend/list');
}

export function addFriend(targetPlayerId: number): Promise<{ success: boolean; msg: string }> {
  return request('/friend/add', {
    method: 'POST',
    body: JSON.stringify({ targetPlayerId }),
  });
}

export function removeFriend(targetPlayerId: number): Promise<{ success: boolean; msg: string }> {
  return request('/friend/remove', {
    method: 'POST',
    body: JSON.stringify({ targetPlayerId }),
  });
}

export function fetchMailList(): Promise<{ mails: MailItem[] }> {
  return request('/mail/list');
}

export function readMail(mailId: string): Promise<MailItem> {
  return request('/mail/read', {
    method: 'POST',
    body: JSON.stringify({ mailId }),
  });
}

export function claimMailReward(mailId: string): Promise<{ success: boolean; reward?: string }> {
  return request('/mail/claim', {
    method: 'POST',
    body: JSON.stringify({ mailId }),
  });
}

// ── 综合排行榜（扩展） ──────────────────────────────────────

export function fetchRankings(type: 'consume' | 'combat' | 'fate' | 'level'): Promise<{ entries: RankingEntry[]; myRank: number }> {
  return request(`/rank/list?type=${type}&limit=50`);
}

// ── 在线领奖（扩展） ──────────────────────────────────────

export interface OnlineRewardData {
  rewardId: string;
  label: string;
  requiredMinutes: number;
  rewardDesc: string;
  claimed: boolean;
  available: boolean;
}

export function fetchOnlineRewards(): Promise<{ rewards: OnlineRewardData[]; onlineMinutes: number }> {
  return request('/event/online-rewards');
}

export function claimOnlineReward(rewardId: string): Promise<{ success: boolean; reward: string }> {
  return request('/event/claim-online', {
    method: 'POST',
    body: JSON.stringify({ rewardId }),
  });
}

export function getCoexploreSession(sessionId: string): Promise<CoexploreSessionData> {
  return request(`/coexplore/session?sessionId=${sessionId}`);
}

export function listCoexploreWaiting(): Promise<{ sessions: CoexploreSessionData[] }> {
  return request('/coexplore/list');
}

export function coexploreExplore(sessionId: string, locationId: string): Promise<CoexploreSessionData> {
  return request('/coexplore/explore', {
    method: 'POST',
    body: JSON.stringify({ sessionId, locationId }),
  });
}

export function coexploreReason(sessionId: string, answerIndex: number): Promise<CoexploreSessionData> {
  return request('/coexplore/reason', {
    method: 'POST',
    body: JSON.stringify({ sessionId, answerIndex }),
  });
}

export function coexploreBoss(sessionId: string): Promise<CoexploreSessionData> {
  return request('/coexplore/boss', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export function leaveCoexplore(sessionId: string): Promise<CoexploreSessionData> {
  return request('/coexplore/leave', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

/** SSE 订阅同游大厅等待列表实时更新，返回关闭函数 */
export function subscribeCoexploreLobby(
  onUpdate: (data: { sessions: CoexploreSessionData[] }) => void,
): () => void {
  const es = new EventSource(`${BASE_URL}/coexplore/subscribe-lobby`);
  es.addEventListener('lobby', (e) => {
    try { onUpdate(JSON.parse(e.data)); } catch { /* ignore */ }
  });
  es.onerror = () => { es.close(); };
  return () => es.close();
}

/** SSE 订阅同游会话实时更新，返回关闭函数 */
export function subscribeCoexplore(
  sessionId: string,
  onUpdate: (data: CoexploreSessionData) => void,
): () => void {
  const es = new EventSource(`${BASE_URL}/coexplore/subscribe?sessionId=${encodeURIComponent(sessionId)}`);
  es.addEventListener('update', (e) => {
    try { onUpdate(JSON.parse(e.data)); } catch { /* ignore */ }
  });
  es.onerror = () => { es.close(); };
  return () => es.close();
}

// ── 诸神黄昏（世界Boss）──────────────────────────────

export interface WorldBossData {
  bossId: string;
  bossName: string;
  bossTitle: string;
  maxHp: number;
  currentHp: number;
  myDamage: number;
  status: 'alive' | 'dead';
}

export interface BossRankEntry {
  playerId: string;
  playerName: string;
  damage: number;
}

interface WorldBossRaw {
  bossId: string;
  name: string;
  level: number;
  currentHp: number;
  totalHp: number;
  status: string;
  participantCount?: number;
  myDamage?: number;
}

export async function fetchWorldBoss(): Promise<WorldBossData> {
  const raw = await request<WorldBossRaw>('/world-boss/info');
  return {
    bossId: raw.bossId,
    bossName: raw.name,
    bossTitle: `LV ${raw.level} · 远古封印`,
    maxHp: raw.totalHp,
    currentHp: raw.currentHp,
    myDamage: raw.myDamage ?? 0,
    status: raw.status === 'dead' ? 'dead' : 'alive',
  };
}

export function attackWorldBoss(): Promise<{ damage: number; cooldownSeconds: number; reward?: string }> {
  return request('/world-boss/attack', { method: 'POST' });
}

export function fetchBossRank(): Promise<{ entries: BossRankEntry[] }> {
  return request('/world-boss/rank');
}

// ── 天命之轮（转盘抽奖）──────────────────────────────

export interface WheelPrize {
  id: string;
  name: string;
  icon: string;
  rare?: boolean;
}

export interface WheelSpinResult {
  prizeIndex: number;
  rewardName: string;
  rewardIcon: string;
  rewardDesc: string;
  remainingFreeSpins: number;
}

export function fetchWheelInfo(): Promise<{
  prizes: WheelPrize[];
  freeSpins: number;
  spinCost: number;
  history: { time: string; reward: string }[];
}> {
  return request('/wheel/info');
}

export function spinWheel(): Promise<WheelSpinResult> {
  return request('/wheel/spin', { method: 'POST' });
}

// ── 太古秘典（技能书抽取）──────────────────────────────

export interface TomeSkillBook {
  id: string;
  name: string;
  icon: string;
  rank: 'SSR' | 'SR' | 'R' | 'N';
  description?: string;
}

export function fetchTomePool(): Promise<{
  books: TomeSkillBook[];
  pityCount: number;
  pityGuarantee: number;
  drawOneCost: number;
  drawTenCost: number;
}> {
  return request('/mystic-tome/pool');
}

export function drawTome(count: number): Promise<{
  results: TomeSkillBook[];
  pityCount: number;
}> {
  return request('/mystic-tome/draw', {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
}

// ── 鸿蒙秘境（限时探索）──────────────────────────────

export interface RealmData {
  realmId: string;
  status: 'idle' | 'active' | 'ended';
  currentFloor: number;
  stamina: number;
  maxStamina: number;
  endTime: number;
  logs: string[];
}

export interface RealmEvent {
  eventId: string;
  type: 'battle' | 'treasure' | 'heal' | 'mystery';
  icon: string;
  title: string;
  description: string;
  choices: string[];
}

export function fetchRealmStatus(): Promise<RealmData> {
  return request('/secret-realm/status');
}

export function enterRealm(): Promise<RealmData> {
  return request('/secret-realm/enter', { method: 'POST' });
}

export function exploreRealm(): Promise<{
  event: RealmEvent;
  stamina: number;
  currentFloor: number;
}> {
  return request('/secret-realm/explore', { method: 'POST' });
}

export function resolveRealmEvent(eventId: string, choice: number): Promise<{
  success: boolean;
  resultText: string;
  loot?: { icon: string; name: string }[];
  logEntry: string;
  stamina: number;
  currentFloor: number;
}> {
  return request('/secret-realm/resolve', {
    method: 'POST',
    body: JSON.stringify({ eventId, choice }),
  });
}
