import type { MonsterCard, NpcCard, PlaceInfo, QuickAction } from '../types';
import type { VisualAssetType } from '../services/api';
import { triggerRedraw } from './redrawStore';

// ── 画风风格系统 ────────────────────────────────
export const VISUAL_STYLE_KEY = 'lunhui.visualStyle';

export const VISUAL_STYLES = [
  { id: 'fairy',     label: '仙气',  desc: '国风仙气，淡雅柔美，粉青银三色，云雾缭绕，温柔梦幻，高饱和清透，东方幻想。' },
  { id: 'guofeng',   label: '国漫',  desc: '现代国风动漫，少女主角立绘，明亮鲜艳，发光大眼，柔光清透，仙气飘逸，新国潮华丽。' },
  { id: 'shoujo',    label: '少漫',  desc: '经典少女漫画，闪亮大眼，星光泡泡，唯美粉调，柔和光晕，浪漫梦幻，蕾丝花边。' },
  { id: 'fairytale', label: '童话',  desc: '梦幻童话绘本，公主气息，星点闪光，温柔色彩，奶油糖霜质感，纯真浪漫，迪士尼系。' },
  { id: 'magic',     label: '魔法',  desc: '魔法少女风，蝴蝶羽翼，星光特效，蕾丝飘带，粉紫渐变，华丽变身，梦幻闪耀。' },
  { id: 'starry',    label: '星梦',  desc: '星空梦境，紫粉星河，璀璨星点，月光柔美，宇宙浪漫，幽蓝高光，星辰流转。' },
  { id: 'macaron',   label: '糖彩',  desc: '马卡龙糖果色，粉蓝薄荷，清甜可爱，柔和高亮，少女糖果系，奶油泡芙感。' },
  { id: 'blossom',   label: '花漫',  desc: '樱花漫天，粉白花瓣纷飞，柔美浪漫，花海少女，春日花季，粉调花卉满屏。' },
  { id: 'crystal',   label: '水晶',  desc: '水晶通透，珠光宝气，琉璃彩虹质感，闪耀光泽，奇幻华美，宝石折射光。' },
  { id: 'watercolor',label: '水彩',  desc: '水彩晕染，柔美渐变，梦幻笔触，粉彩透明，温柔治愈，绘本插画质感。' },
  { id: 'spring',    label: '春彩',  desc: '明艳春日风，鲜花盛开，暖粉橙绿，清新明亮，色彩鲜艳饱和，生机勃勃。' },
  { id: 'glow',      label: '流光',  desc: '金色光晕，明亮暖调，璀璨华贵，发光国风，鎏金流光，霞光万丈。' },
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
  return `画面风格：${getVisualStyle().desc} 总体清新淡雅，色彩丰富明亮，柔光通透，唯美工笔国风，焦点清晰，主体锐利，细节丰富，画面干净，禁止暗沉厚重，禁止柔焦糊片。`;
}

// 保留向后兼容
export const LUNHUI_VISUAL_CONTEXT = '清新淡雅东方仙侠游戏画面，色彩丰富明亮，柔光通透，唯美工笔国风，焦点清晰，移动端H5 MMO界面。';

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

// ── Flux 训练分桶常量 · 偏离这些尺寸出图会软糊 ────────
const FLUX_SCENE_W = 1344;     // 16:9 横屏场景
const FLUX_SCENE_H = 768;
const FLUX_PORTRAIT_W = 832;   // 2:3 立绘
const FLUX_PORTRAIT_H = 1216;
const FLUX_ICON_SIZE = 1024;   // 1:1 图标

export function placeSceneAsset(place: PlaceInfo): VisualAssetSpec {
  return {
    assetKey: `place_${slug(place.zoneId)}`,
    type: 'scene',
    name: `${place.region}·${place.title}`,
    description: `${place.description}。${place.landscape}`,
    context: getVisualContext(),
    width: FLUX_SCENE_W,
    height: FLUX_SCENE_H,
  };
}

export function npcPortraitAsset(place: PlaceInfo, npc: NpcCard): VisualAssetSpec {
  return {
    assetKey: `npc_${slug(place.zoneId)}_${slug(npc.id)}`,
    type: 'portrait',
    name: npc.name,
    description: `${npc.role}。${npc.line}`,
    context: `${place.region}·${place.title}。${getVisualContext()}`,
    width: FLUX_PORTRAIT_W,
    height: FLUX_PORTRAIT_H,
  };
}

export function monsterPortraitAsset(place: PlaceInfo, monster: MonsterCard): VisualAssetSpec {
  return {
    assetKey: `monster_${slug(place.zoneId)}_${slug(monster.id)}`,
    type: 'monster',
    name: monster.name,
    description: `等级 ${monster.level}，${monster.reward}`,
    context: `${place.region}·${place.title}。${getVisualContext()}`,
    width: FLUX_PORTRAIT_W,
    height: FLUX_PORTRAIT_H,
  };
}

export function actionIconAsset(place: PlaceInfo, action: QuickAction): VisualAssetSpec {
  return {
    assetKey: `action_${slug(action.id)}`,
    type: 'icon',
    name: action.label,
    description: `游戏功能入口图标：${action.label}`,
    context: `${place.region}·${place.title}。${getVisualContext()}`,
    width: FLUX_ICON_SIZE,
    height: FLUX_ICON_SIZE,
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
    width: FLUX_SCENE_W,
    height: FLUX_SCENE_H,
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
    width: FLUX_PORTRAIT_W,
    height: FLUX_PORTRAIT_H,
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
    width: FLUX_SCENE_W,
    height: FLUX_SCENE_H,
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
    width: FLUX_SCENE_W,
    height: FLUX_SCENE_H,
  };
}
