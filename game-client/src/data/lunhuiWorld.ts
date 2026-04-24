import type { PageId, PlaceInfo, QuickAction, ZoneExit } from '../types';

export interface TeleportGroup {
  label: string;
  items: Array<{
    id: string;
    label: string;
    pageId: PageId;
    zoneId?: string;
    badge?: 'hot' | 'new';
  }>;
}

const funcMenu: QuickAction[] = [
  { id: 'auction', label: '拍卖', pageId: 'auction', badge: 'hot' },
  { id: 'shop', label: '商城', pageId: 'shop' },
  { id: 'forge', label: '神匠', pageId: 'forge' },
  { id: 'housing', label: '家产', pageId: 'housing' },
  { id: 'market', label: '集市', pageId: 'market', badge: 'new' },
  { id: 'stall', label: '小摊', pageId: 'stall' },
  { id: 'wheel', label: '砸蛋', pageId: 'wheel', badge: 'hot' },
  { id: 'pet', label: '宝宝', pageId: 'pet' },
];

const commonNotices = ['天降神宠开启', '充值礼包限时开放', '今晚 21:00 世界 Boss', '盟会占城战报名中'];

function exit(direction: ZoneExit['direction'], targetZoneId: string, label: string): ZoneExit {
  return { direction, targetZoneId, label };
}

export const LUNHUI_PLACES: Record<string, PlaceInfo> = {
  main_city: {
    zoneId: 'main_city',
    region: '气盖山河区',
    title: '主城',
    description: '商贾云集，传送枢纽与拍卖集市都在此处。',
    coord: [2, 2],
    landscape: '灯火长街、旗幡招展、商铺与来往侠客交织成主城夜景',
    notices: commonNotices,
    quickActions: funcMenu,
    exits: [
      exit('西', 'social_district', '婚介代练 (1,2)'),
      exit('南', 'hunting_ground', '猎场宝山 (2,1)'),
      exit('东', 'auction_lane', '拍卖长街 (3,2)'),
      exit('北', 'snow_field', '极北大陆 (2,3)'),
    ],
    npcs: [
      { id: 'dreamer', name: '梦中人', role: '传送使者', line: '你心之所向，是何处？', pageId: 'teleport' },
      { id: 'guide', name: '新手使', role: '引路人', line: '先把任务清一轮，今日会轻松很多。', pageId: 'quest' },
    ],
    monsters: [],
  },
  social_district: {
    zoneId: 'social_district',
    region: '极北大陆',
    title: '婚介代练',
    description: '玩友和婚介聚集之地，悬赏与代练消息四处可见。',
    coord: [1, 2],
    landscape: '朱灯红幔、姻缘树与悬赏木牌并立，街角不断有玩家驻足交谈',
    notices: ['今日红线加成 +10%', '代练榜前十可领取奖励'],
    quickActions: [
      { id: 'matchmaking', label: '婚介', pageId: 'matchmaking' },
      { id: 'friend', label: '玩友', pageId: 'friend' },
      { id: 'hunt', label: '追杀令', pageId: 'hunt' },
      { id: 'chat', label: '聊天', pageId: 'chat' },
    ],
    exits: [
      exit('东', 'main_city', '返回主城 (2,2)'),
      exit('北', 'fishing_wharf', '钓鱼台 (1,3)'),
    ],
    npcs: [
      { id: 'matchmaker', name: '月老使', role: '婚介', line: '有缘之人，不妨先看一眼。', pageId: 'matchmaking' },
      { id: 'hunter', name: '追命客', role: '悬赏官', line: '要不要接一张追杀令？', pageId: 'hunt' },
    ],
    monsters: [],
  },
  hunting_ground: {
    zoneId: 'hunting_ground',
    region: '极北大陆',
    title: '猎场宝山',
    description: '怪物密集，副本入口与世界 Boss 集结点都在附近。',
    coord: [2, 1],
    landscape: '碎石猎场、篝火营地与远处山门相接，时不时传来异兽嚎叫',
    notices: ['世界 Boss 剩余 32 分钟', '副本双倍掉落进行中'],
    quickActions: [
      { id: 'battle', label: '战斗', pageId: 'battle' },
      { id: 'world-boss', label: '世界 Boss', pageId: 'world-boss', badge: 'hot' },
      { id: 'dungeon', label: '副本', pageId: 'dungeon' },
      { id: 'ranking', label: '排行', pageId: 'ranking' },
    ],
    exits: [
      exit('北', 'main_city', '返回主城 (2,2)'),
      exit('东', 'mystic_forge', '神匠坊 (3,1)'),
    ],
    npcs: [
      { id: 'captain', name: '猎场统领', role: '战斗教官', line: '打完这里，再去挑战世界 Boss。', pageId: 'battle' },
    ],
    monsters: [
      { id: 'icewolf', name: '雪原狼王', level: 22, reward: '掉落兽骨与金币', pageId: 'battle' },
      { id: 'rock_guard', name: '山门石卫', level: 28, reward: '掉落强化石', pageId: 'battle' },
    ],
  },
  auction_lane: {
    zoneId: 'auction_lane',
    region: '极北大陆',
    title: '拍卖长街',
    description: '拍卖行、集市和小摊挨在一起，是全服经济中心。',
    coord: [3, 2],
    landscape: '长街两侧高挂灯牌，拍卖钟声与叫卖声交织不绝',
    notices: ['宝石拍卖 10 分钟后开启', '集市税率 2%'],
    quickActions: [
      { id: 'auction', label: '拍卖行', pageId: 'auction', badge: 'hot' },
      { id: 'market', label: '集市', pageId: 'market' },
      { id: 'stall', label: '小摊', pageId: 'stall' },
      { id: 'mail', label: '邮件', pageId: 'mail' },
    ],
    exits: [
      exit('西', 'main_city', '返回主城 (2,2)'),
      exit('南', 'mystic_forge', '神匠坊 (3,1)'),
    ],
    npcs: [
      { id: 'auctioneer', name: '拍卖使', role: '拍卖行', line: '价高者得，落槌不悔。', pageId: 'auction' },
      { id: 'merchant', name: '集市掌柜', role: '集市', line: '今日材料走俏，早卖早赚。', pageId: 'market' },
    ],
    monsters: [],
  },
  snow_field: {
    zoneId: 'snow_field',
    region: '极北大陆',
    title: '极北大陆',
    description: '雪线之上通往钓鱼、探险与秘境入口。',
    coord: [2, 3],
    landscape: '漫天风雪、冰晶栈道与远处古塔构成极北地貌',
    notices: ['极光异象已出现', '秘境入口刷新'],
    quickActions: [
      { id: 'world-map', label: '世界地图', pageId: 'world-map' },
      { id: 'events', label: '活动中心', pageId: 'events' },
      { id: 'vip', label: 'VIP', pageId: 'vip' },
      { id: 'settings', label: '设置', pageId: 'settings' },
    ],
    exits: [
      exit('南', 'main_city', '返回主城 (2,2)'),
      exit('西', 'fishing_wharf', '钓鱼台 (1,3)'),
    ],
    npcs: [
      { id: 'guard', name: '极北巡使', role: '世界地图', line: '北境很大，先看地图再出发。', pageId: 'world-map' },
    ],
    monsters: [
      { id: 'snow_spirit', name: '雪魄', level: 30, reward: '掉落冰魄与秘境钥匙', pageId: 'battle' },
    ],
  },
  fishing_wharf: {
    zoneId: 'fishing_wharf',
    region: '极北大陆',
    title: '钓鱼台',
    description: '休闲玩家和社交玩家常来的地方，也可通往留言与玩友页面。',
    coord: [1, 3],
    landscape: '浮桥、轻舟与结冰水面并存，晚霞映在钓台木栏上',
    notices: ['钓鱼活动开启', '今日玩友匹配成功率提升'],
    quickActions: [
      { id: 'friend', label: '玩友', pageId: 'friend' },
      { id: 'message-board', label: '留言板', pageId: 'message-board' },
      { id: 'chat', label: '私聊', pageId: 'chat' },
      { id: 'pet', label: '宝宝', pageId: 'pet' },
    ],
    exits: [
      exit('东', 'snow_field', '极北大陆 (2,3)'),
      exit('南', 'social_district', '婚介代练 (1,2)'),
    ],
    npcs: [
      { id: 'angler', name: '钓叟', role: '休闲引导', line: '鱼上钩时，心也会静下来。', pageId: 'events' },
    ],
    monsters: [],
  },
  mystic_forge: {
    zoneId: 'mystic_forge',
    region: '极北大陆',
    title: '神匠坊',
    description: '锻造、强化和家园工坊聚集之地。',
    coord: [3, 1],
    landscape: '炉火通明、铁砧轰鸣，地面布满流淌的火光与兵器残影',
    notices: ['强化暴击概率提升', '家园工坊可领取日常材料'],
    quickActions: [
      { id: 'forge', label: '神匠', pageId: 'forge' },
      { id: 'housing', label: '家产', pageId: 'housing' },
      { id: 'inventory', label: '背包', pageId: 'inventory' },
      { id: 'status', label: '状态', pageId: 'status' },
    ],
    exits: [
      exit('北', 'auction_lane', '拍卖长街 (3,2)'),
      exit('西', 'hunting_ground', '猎场宝山 (2,1)'),
    ],
    npcs: [
      { id: 'smith', name: '神匠', role: '强化', line: '兵器虽冷，名气却能烧得滚烫。', pageId: 'forge' },
      { id: 'steward', name: '管家', role: '家园', line: '家业越稳，日常收益越足。', pageId: 'housing' },
    ],
    monsters: [],
  },
};

export const WORLD_MAP_ORDER = Object.values(LUNHUI_PLACES);

export const TELEPORT_GROUPS: TeleportGroup[] = [
  {
    label: '功能区',
    items: [
      { id: 'events', label: '活动', pageId: 'events' },
      { id: 'quest', label: '任务', pageId: 'quest' },
      { id: 'messages', label: '消息', pageId: 'messages' },
      { id: 'vip', label: 'VIP', pageId: 'vip' },
    ],
  },
  {
    label: '经济区',
    items: [
      { id: 'shop', label: '商城', pageId: 'shop' },
      { id: 'market', label: '集市', pageId: 'market' },
      { id: 'auction', label: '拍卖', pageId: 'auction', badge: 'hot' },
      { id: 'stall', label: '小摊', pageId: 'stall' },
    ],
  },
  {
    label: '战斗区',
    items: [
      { id: 'battle', label: '战斗', pageId: 'battle' },
      { id: 'dungeon', label: '副本', pageId: 'dungeon' },
      { id: 'world-boss', label: '世界 Boss', pageId: 'world-boss', badge: 'hot' },
      { id: 'ranking', label: '排行', pageId: 'ranking' },
    ],
  },
  {
    label: '社交区',
    items: [
      { id: 'chat', label: '聊天', pageId: 'chat' },
      { id: 'friend', label: '玩友', pageId: 'friend' },
      { id: 'matchmaking', label: '婚介', pageId: 'matchmaking' },
      { id: 'mail', label: '邮件', pageId: 'mail' },
    ],
  },
];

export const BOTTOM_ACTIONS: Array<{ id: string; label: string; pageId: PageId }> = [
  { id: 'status', label: '状态', pageId: 'status' },
  { id: 'inventory', label: '道具', pageId: 'inventory' },
  { id: 'nearby', label: '四周', pageId: 'nearby' },
  { id: 'messages', label: '消息', pageId: 'messages' },
  { id: 'pet', label: '宝宝', pageId: 'pet' },
  { id: 'teleport', label: '功能', pageId: 'teleport' },
];

export function getPlaceInfo(zoneId: string): PlaceInfo {
  return LUNHUI_PLACES[zoneId] || LUNHUI_PLACES.main_city;
}
