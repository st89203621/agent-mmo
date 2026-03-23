import type { DialogueChoice, NpcInfo, Relation, BookWorld, MemoryFragment } from '../types';

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

export interface DialogueData {
  sessionId: string;
  speaker: string;
  emotion: string;
  text: string;
  fateDelta: number;
  trustDelta: number;
  allowFreeInput: boolean;
  choicesJson: string;
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
            try { callbacks.onComplete(JSON.parse(data)); } catch {}
          } else if (eventName === 'error') {
            try { callbacks.onError(new Error(JSON.parse(data).msg)); } catch {}
          }
          eventName = '';
        }
      }
    }
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

// ── NPC ──────────────────────────────────────

export function fetchNpcs(worldIndex = 0): Promise<{ npcs: NpcInfo[] }> {
  return request(`/npc/list?worldIndex=${worldIndex}`);
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

// ── 书籍世界 ──────────────────────────────────────

export function fetchBookWorlds(): Promise<{ books: BookWorld[] }> {
  return request('/bookworld/list');
}

export function selectBookWorld(worldIndex: number, bookId: string) {
  return request('/bookworld/select', {
    method: 'POST',
    body: JSON.stringify({ worldIndex, bookId }),
  });
}

// ── 记忆碎片 ──────────────────────────────────────

export function fetchMemories(worldIndex?: number): Promise<{ memories: MemoryFragment[] }> {
  const query = worldIndex !== undefined ? `?worldIndex=${worldIndex}` : '';
  return request(`/memory/list${query}`);
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
