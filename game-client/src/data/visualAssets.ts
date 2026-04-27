import type { MonsterCard, NpcCard, PlaceInfo, QuickAction } from '../types';
import type { VisualAssetType } from '../services/api';

export const LUNHUI_VISUAL_CONTEXT =
  '统一参考 fusion_mockup.html：黑檀暗底、鎏金边框、朱红点缀、卷轴纸纹、移动端H5 MMO界面。';

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
    context: LUNHUI_VISUAL_CONTEXT,
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
    context: `${place.region}·${place.title}。${LUNHUI_VISUAL_CONTEXT}`,
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
    context: `${place.region}·${place.title}。${LUNHUI_VISUAL_CONTEXT}`,
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
    context: `${place.region}·${place.title}。${LUNHUI_VISUAL_CONTEXT}`,
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
    context: LUNHUI_VISUAL_CONTEXT,
    width: 832,
    height: 512,
  };
}
