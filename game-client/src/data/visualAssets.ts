import type { MonsterCard, NpcCard, PlaceInfo, QuickAction } from '../types';
import type { VisualAssetType } from '../services/api';
import { triggerRedraw } from './redrawStore';

// ── 画风风格系统 ────────────────────────────────
export const VISUAL_STYLE_KEY = 'lunhui.visualStyle';

export const VISUAL_STYLES = [
  { id: 'fairy',  label: '仙气', desc: '明亮仙气，淡雅柔美，粉青银三色，云雾缭绕，温柔梦幻，高饱和清透，东方幻想。' },
  { id: 'spring', label: '春彩', desc: '明艳春日风，鲜花盛开，暖粉橙绿，清新明亮，色彩鲜艳饱和，生机勃勃。' },
  { id: 'glow',   label: '金华', desc: '金色光晕，明亮暖调，璀璨华贵，史诗大气，发光国风，鎏金流光。' },
  { id: 'ink',    label: '水墨', desc: '工笔重彩，明亮宣纸质感，淡雅色调，传统山水风，清雅通透。' },
] as const;

export type VisualStyleId = typeof VISUAL_STYLES[number]['id'];

export function getVisualStyle(): (typeof VISUAL_STYLES)[number] {
  try {
    const id = localStorage.getItem(VISUAL_STYLE_KEY) || 'fairy';
    return VISUAL_STYLES.find((s) => s.id === id) ?? VISUAL_STYLES[0];
  } catch {
    return VISUAL_STYLES[0];
  }
}

export function setVisualStyle(id: VisualStyleId): void {
  try { localStorage.setItem(VISUAL_STYLE_KEY, id); } catch { /* noop */ }
}

export function clearAllAssetCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('lunhui.asset.'));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }
  triggerRedraw();
}

export function getVisualContext(): string {
  return `画面风格：${getVisualStyle().desc} 总体清新淡雅，色彩丰富明亮，柔光通透，水彩晕染质感，唯美国风，画面干净，禁止暗沉厚重。`;
}

// 保留向后兼容
export const LUNHUI_VISUAL_CONTEXT = '清新淡雅东方仙侠游戏画面，色彩丰富明亮，柔光通透，水彩晕染，唯美国风，移动端H5 MMO界面。';

// ── 资产类型 ─────────────────────────────────────
export interface VisualAssetSpec {
  assetKey: string;
  type: VisualAssetType;
  name: string;
  description: string;
  context?: string;
  width: number;
  height: number;
}

function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9_\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'asset';
}

export function placeSceneAsset(place: PlaceInfo): VisualAssetSpec {
  return {
    assetKey: `place_${slug(place.zoneId)}`,
    type: 'scene',
    name: `${place.region}·${place.title}`,
    description: `${place.description}。${place.landscape}`,
    context: getVisualContext(),
    width: 832,
    height: 512,
  };
}

export function npcPortraitAsset(place: PlaceInfo, npc: NpcCard): VisualAssetSpec {
  return {
    assetKey: `npc_${slug(place.zoneId)}_${slug(npc.id)}`,
    type: 'portrait',
    name: npc.name,
    description: `${npc.role}。${npc.line}`,
    context: `${place.region}·${place.title}。${getVisualContext()}`,
    width: 512,
    height: 640,
  };
}

export function monsterPortraitAsset(place: PlaceInfo, monster: MonsterCard): VisualAssetSpec {
  return {
    assetKey: `monster_${slug(place.zoneId)}_${slug(monster.id)}`,
    type: 'monster',
    name: monster.name,
    description: `等级 ${monster.level}，${monster.reward}`,
    context: `${place.region}·${place.title}。${getVisualContext()}`,
    width: 512,
    height: 640,
  };
}

export function actionIconAsset(place: PlaceInfo, action: QuickAction): VisualAssetSpec {
  return {
    assetKey: `action_${slug(action.id)}`,
    type: 'icon',
    name: action.label,
    description: `游戏功能入口图标：${action.label}`,
    context: `${place.region}·${place.title}。${getVisualContext()}`,
    width: 512,
    height: 512,
  };
}

export function battleSceneAsset(params: {
  zoneId?: string;
  zoneName?: string;
  monsterId?: string;
  monsterName?: string;
}): VisualAssetSpec {
  return {
    assetKey: `battle_${slug(params.zoneId || 'field')}_${slug(params.monsterId || params.monsterName || 'encounter')}`,
    type: 'scene',
    name: params.monsterName ? `${params.zoneName || '野外'}·${params.monsterName}` : params.zoneName || '遭遇战',
    description: `回合制战斗背景，地点 ${params.zoneName || params.zoneId || '猎场宝山'}，敌人 ${params.monsterName || '妖兽'}`,
    context: getVisualContext(),
    width: 832,
    height: 512,
  };
}

export function petPortraitAsset(params: {
  petTemplateId: string;
  petType?: string;
  element?: string;
  nickname?: string;
}): VisualAssetSpec {
  const name = params.nickname || params.petTemplateId;
  return {
    assetKey: `pet_${slug(params.petTemplateId)}`,
    type: 'monster',
    name,
    description: `灵兽立绘，血统：${params.petType || '神兽'}，属性：${params.element || ''}，神态灵动，仙气飘逸`,
    context: getVisualContext(),
    width: 512,
    height: 640,
  };
}

export function dungeonSceneAsset(params: {
  dungeonId: string;
  dungeonName: string;
  type?: string;
  description?: string;
}): VisualAssetSpec {
  return {
    assetKey: `dungeon_${slug(params.dungeonId)}`,
    type: 'scene',
    name: params.dungeonName,
    description: `副本场景背景，${params.type || ''}风格，${params.description || params.dungeonName}，险峻壮阔`,
    context: getVisualContext(),
    width: 832,
    height: 400,
  };
}

export function characterSceneAsset(params: {
  profession?: string;
  playerName?: string;
}): VisualAssetSpec {
  const prof = params.profession || '剑客';
  return {
    assetKey: `character_bg_${slug(prof)}`,
    type: 'scene',
    name: `${prof}·角色`,
    description: `角色背景场景，${prof}职业气质，仙气浓郁，宏大壮阔`,
    context: getVisualContext(),
    width: 832,
    height: 400,
  };
}
