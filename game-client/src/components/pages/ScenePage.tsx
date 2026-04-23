import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { fetchCurrentZone, moveToZone, fetchNearbyPlayers } from '../../services/api';
import { toast } from '../../store/toastStore';
import type { ZoneInfo, NearbyPlayer } from '../../types';
import styles from './ScenePage.module.css';

const DIR_ARROW: Record<string, string> = {
  '东': '→', '西': '←', '南': '↓', '北': '↑',
};

const FUNC_ITEMS = [
  { id: 'auction',  icon: '🏛️', label: '拍卖' },
  { id: 'shop',     icon: '🛒', label: '商城' },
  { id: 'forge',    icon: '⚒️',  label: '神匠' },
  { id: 'housing',  icon: '🏠', label: '家产' },
  { id: 'market',   icon: '🏪', label: '集市' },
  { id: 'stall',    icon: '🎪', label: '小摊' },
  { id: 'wheel',    icon: '🎡', label: '砸蛋' },
  { id: 'pet',      icon: '🐲', label: '宝宝' },
] as const;

const TELEPORT_GROUPS = [
  {
    label: '功能区',
    items: [
      { label: '充值礼包', pageId: 'activity' },
      { label: '在线领奖', pageId: 'activity' },
      { label: '探险',    pageId: 'explore' },
      { label: '活动',    pageId: 'activity' },
    ],
  },
  {
    label: '经济区',
    items: [
      { label: '商城',   pageId: 'shop' },
      { label: '集市',   pageId: 'market' },
      { label: '小摊',   pageId: 'stall' },
      { label: '拍卖行', pageId: 'auction' },
    ],
  },
  {
    label: '战斗区',
    items: [
      { label: '追杀',   pageId: 'battle' },
      { label: '武斗',   pageId: 'team-battle' },
      { label: '狩猎',   pageId: 'explore' },
      { label: '世界Boss', pageId: 'world-boss' },
    ],
  },
  {
    label: '社交区',
    items: [
      { label: '婚介',   pageId: 'fate-map' },
      { label: '游乐',   pageId: 'activity' },
      { label: '钓鱼',   pageId: 'treasure-mountain' },
      { label: '留言板', pageId: 'message-board' },
    ],
  },
] as const;

const DEFAULT_ZONE: ZoneInfo = {
  zoneId: 'main_city',
  name: '主城',
  coordinates: [2, 2],
  description: '交易买卖中心，安全区域',
  sceneHint: '',
  exits: [
    { direction: '西', targetZoneId: 'social_district', label: '婚介代练(1,2)' },
    { direction: '南', targetZoneId: 'hunting_ground',  label: '猎场宝山(2,1)' },
  ],
  activities: [],
  nearbyPlayers: [],
  hotEvents: [
    { id: 'divine_pet', label: '★天降神宠★', pageId: 'wheel' },
    { id: 'recharge',   label: '【充值礼包】', pageId: 'activity' },
    { id: 'all_level',  label: '【全民冲级】', pageId: 'activity' },
    { id: 'all_pet',    label: '【全民神宠】', pageId: 'activity' },
  ],
};

export default function ScenePage() {
  const { navigateTo, currentBookWorld } = useGameStore();
  const { playerName } = usePlayerStore();
  const [zone, setZone] = useState<ZoneInfo>(DEFAULT_ZONE);
  const [nearby, setNearby] = useState<NearbyPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [showTeleport, setShowTeleport] = useState(false);

  const bookName = currentBookWorld?.title || '七世轮回';
  const zoneName = currentBookWorld ? `${bookName.slice(0, 3)}·${zone.name}` : zone.name;

  useEffect(() => {
    Promise.all([
      fetchCurrentZone().catch(() => DEFAULT_ZONE),
      fetchNearbyPlayers().catch(() => ({ players: [] })),
    ]).then(([z, np]) => {
      setZone(z);
      setNearby(np.players || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleMove = useCallback(async (targetZoneId: string) => {
    if (moving) return;
    setMoving(true);
    try {
      const newZone = await moveToZone(targetZoneId);
      setZone(newZone);
      const np = await fetchNearbyPlayers().catch(() => ({ players: [] }));
      setNearby(np.players || []);
      toast.success(`已到达 ${newZone.name}`);
    } catch {
      toast.error('移动失败');
    }
    setMoving(false);
  }, [moving]);

  const handleFuncBtn = useCallback((id: string) => {
    navigateTo(id as Parameters<typeof navigateTo>[0]);
  }, [navigateTo]);

  const handleTeleport = useCallback((pageId: string) => {
    setShowTeleport(false);
    navigateTo(pageId as Parameters<typeof navigateTo>[0]);
  }, [navigateTo]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <div style={{ color: 'var(--gold-dim)', fontSize: 14, textAlign: 'center' }}>加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* 顶部状态栏 */}
      <div className={styles.topBar}>
        <div className={styles.topRow}>
          <div className={styles.zoneTitle}>
            {zoneName}
            <span className={styles.zoneCoord}>
              ({zone.coordinates[0]},{zone.coordinates[1]})
            </span>
          </div>
          <div className={styles.topActions}>
            <button className={styles.topBtn} onClick={() => navigateTo('quest')}>任务</button>
            <button className={styles.topBtn} onClick={() => navigateTo('story')}>聊天</button>
            <button className={styles.teleportBtn} onClick={() => setShowTeleport(true)}>传送</button>
          </div>
        </div>
        <div className={styles.zoneDesc}>{zone.description}</div>
      </div>

      <div className={styles.scrollArea}>
        {/* 热门活动横幅 */}
        {zone.hotEvents.length > 0 && (
          <div className={styles.eventBanner}>
            {zone.hotEvents.map(e => (
              <button
                key={e.id}
                className={`${styles.eventTag} ${e.id === 'divine_pet' ? styles.eventTagHot : styles.eventTagNew}`}
                onClick={() => handleTeleport(e.pageId)}
              >
                {e.label}
              </button>
            ))}
          </div>
        )}

        {/* 功能宫格 */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>功能</div>
          <div className={styles.funcGrid}>
            {FUNC_ITEMS.map(f => (
              <button
                key={f.id}
                className={styles.funcBtn}
                onClick={() => handleFuncBtn(f.id)}
              >
                <span className={styles.funcIcon}>{f.icon}</span>
                <span className={styles.funcLabel}>{f.label}</span>
                {(f.id === 'auction' || f.id === 'market') && (
                  <span className={styles.funcNew} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 地图导航 */}
        {zone.exits.length > 0 && (
          <div className={styles.mapNav}>
            <div className={styles.mapNavTitle}>地图导航</div>
            <div className={styles.mapExits}>
              {zone.exits.map(exit => (
                <button
                  key={exit.targetZoneId}
                  className={styles.exitBtn}
                  disabled={moving}
                  onClick={() => handleMove(exit.targetZoneId)}
                >
                  <span className={styles.dirArrow}>{DIR_ARROW[exit.direction] || exit.direction}</span>
                  {exit.direction}: {exit.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 附近玩家 */}
        {nearby.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>四周（{nearby.length}人在线）</div>
            <div className={styles.nearbyList}>
              {nearby.map(p => (
                <div
                  key={p.playerId}
                  className={styles.nearbyCard}
                  onClick={() => navigateTo('story')}
                >
                  <div className={styles.nearbyAvatar}>
                    {p.portraitUrl
                      ? <img src={p.portraitUrl} alt={p.name} />
                      : p.name.charAt(0)}
                  </div>
                  <div className={styles.nearbyName}>{p.name}</div>
                  <div className={styles.nearbyLv}>Lv.{p.level}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 角色面板（底部） */}
      <div className={styles.playerPanel}>
        {([
          { id: 'character',  icon: '⚔️',  label: '状态' },
          { id: 'inventory',  icon: '🎒', label: '道具' },
          { id: 'scene',      icon: '👥', label: '四周' },
          { id: 'story',      icon: '💬', label: '消息' },
          { id: 'pet',        icon: '🐲', label: '宝宝' },
          { id: 'activity',   icon: '⚙️',  label: '功能' },
        ] as { id: string; icon: string; label: string }[]).map(p => (
          <button
            key={p.id}
            className={styles.panelBtn}
            onClick={() => p.id === 'scene' ? undefined : handleFuncBtn(p.id)}
          >
            <span className={styles.panelBtnIcon}>{p.icon}</span>
            <span className={styles.panelBtnLabel}>{p.label}</span>
          </button>
        ))}
      </div>

      {/* 传送面板 */}
      {showTeleport && (
        <div className={styles.overlay} onClick={() => setShowTeleport(false)}>
          <div className={styles.teleportPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.teleportTitle}>传送</div>
            <div className={styles.teleportNpc}>梦中人：我可以送你到：</div>
            {TELEPORT_GROUPS.map(group => (
              <div key={group.label} className={styles.teleportGroup}>
                <div className={styles.teleportGroupLabel}>{group.label}</div>
                <div className={styles.teleportBtns}>
                  {group.items.map(item => (
                    <button
                      key={item.label}
                      className={styles.teleportItemBtn}
                      onClick={() => handleTeleport(item.pageId)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className={styles.teleportClose} onClick={() => setShowTeleport(false)}>
              返回游戏
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
