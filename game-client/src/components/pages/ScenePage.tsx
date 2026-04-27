import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchCurrentZone,
  fetchNearbyPlayers,
  fetchPersonInfo,
  moveToZone,
  type PersonData,
} from '../../services/api';
import { BOTTOM_ACTIONS, getPlaceInfo } from '../../data/lunhuiWorld';
import { toast } from '../../store/toastStore';
import { StatBar, BarBlock, BarRow } from '../common/fusion';
import type { NearbyPlayer, QuickAction, ZoneInfo } from '../../types';
import styles from './ScenePage.module.css';

const FALLBACK_ZONE: ZoneInfo = {
  zoneId: 'main_city',
  name: '主城',
  coordX: 2,
  coordY: 2,
  description: '气盖山河区的主枢纽，通往拍卖、集市、婚介与猎场。',
  sceneHint: '主城夜景',
  exits: [],
  nearbyPlayers: [],
  hotEvents: [
    { id: 'wheel', label: '天降神宠', pageId: 'wheel' },
    { id: 'boss', label: '世界 Boss', pageId: 'world-boss' },
  ],
};

type CompassSlot = 'nw' | 'n' | 'ne' | 'w' | 'center' | 'e' | 'sw' | 's' | 'se';

interface CompassCell {
  slot: CompassSlot;
  label: string;
  coord?: string;
  action?: () => void;
  state: 'empty' | 'center' | 'exit';
}

const SLOT_ORDER: CompassSlot[] = ['nw', 'n', 'ne', 'w', 'center', 'e', 'sw', 's', 'se'];

function getCompassSlot(dx: number, dy: number): CompassSlot | null {
  if (dx === 0 && dy === -1) return 'n';
  if (dx === 0 && dy === 1) return 's';
  if (dx === -1 && dy === 0) return 'w';
  if (dx === 1 && dy === 0) return 'e';
  if (dx === -1 && dy === -1) return 'nw';
  if (dx === 1 && dy === -1) return 'ne';
  if (dx === -1 && dy === 1) return 'sw';
  if (dx === 1 && dy === 1) return 'se';
  return null;
}

export default function ScenePage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const playerName = usePlayerStore((s) => s.playerName);
  const [zone, setZone] = useState<ZoneInfo>(FALLBACK_ZONE);
  const [nearby, setNearby] = useState<NearbyPlayer[]>([]);
  const [person, setPerson] = useState<PersonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [currentZone, nearbyPlayers, personData] = await Promise.all([
      fetchCurrentZone().catch(() => FALLBACK_ZONE),
      fetchNearbyPlayers().catch(() => ({ players: [] })),
      fetchPersonInfo().catch(() => null as PersonData | null),
    ]);
    setZone(currentZone);
    setNearby(nearbyPlayers.players || []);
    setPerson(personData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const place = useMemo(() => getPlaceInfo(zone.zoneId), [zone.zoneId]);
  const quickActions: QuickAction[] = place.quickActions.length
    ? place.quickActions
    : BOTTOM_ACTIONS.map((item) => ({ id: item.id, label: item.label, pageId: item.pageId }));
  const notices = place.notices.length ? place.notices : zone.hotEvents.map((item) => item.label);
  const primaryNpc = place.npcs[0] ?? {
    id: 'guide',
    name: '梦中人',
    role: '传送使者',
    line: '你心之所向，是何处？',
    pageId: 'teleport' as const,
  };

  const pageContext = useMemo(() => ({
    zoneId: place.zoneId,
    zoneName: place.title,
    region: place.region,
  }), [place.region, place.title, place.zoneId]);

  const handleMove = useCallback(async (targetZoneId: string) => {
    if (moving) return;
    setMoving(true);
    try {
      const nextZone = await moveToZone(targetZoneId);
      toast.success(`已到达 ${nextZone.name}`);
      setZone(nextZone);
      navigateTo('place', { zoneId: nextZone.zoneId });
    } catch {
      toast.error('移动失败');
    } finally {
      setMoving(false);
    }
  }, [moving, navigateTo]);

  const compass = useMemo<CompassCell[]>(() => {
    const cells = new Map<CompassSlot, CompassCell>();
    cells.set('center', {
      slot: 'center',
      label: '你在此',
      coord: `(${place.coord[0]},${place.coord[1]})`,
      state: 'center',
    });

    for (const exit of place.exits.length ? place.exits : zone.exits) {
      const target = getPlaceInfo(exit.targetZoneId);
      const dx = target.coord[0] - place.coord[0];
      const dy = target.coord[1] - place.coord[1];
      const slot = getCompassSlot(dx, dy);
      if (!slot) continue;
      cells.set(slot, {
        slot,
        label: target.title,
        coord: `(${target.coord[0]},${target.coord[1]})`,
        state: 'exit',
        action: () => handleMove(exit.targetZoneId),
      });
    }

    return SLOT_ORDER.map((slot) => cells.get(slot) ?? {
      slot,
      label: '',
      coord: undefined,
      action: undefined,
      state: 'empty',
    });
  }, [handleMove, place, zone.exits]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.appbar}>
          <div className={styles.loading}>正在载入主城情报...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.appbar}>
        <div className={styles.row1}>
          <div className={styles.loc}>
            <span className={styles.book}>气盖山河</span>
            <span className={styles.zone}>{place.region} · {place.title}</span>
            <span className={styles.coord}>({place.coord[0]},{place.coord[1]})</span>
          </div>
          <div className={styles.icons}>
            <button className={styles.icon} onClick={load} type="button" aria-label="刷新">⟳</button>
            <button className={`${styles.icon} ${styles.dot}`} onClick={() => navigateTo('messages')} type="button">信</button>
            <button className={styles.icon} onClick={() => navigateTo('friend')} type="button">友</button>
            <button className={styles.icon} onClick={() => navigateTo('teleport')} type="button">传</button>
          </div>
        </div>
      </div>

      <StatBar
        profession={person?.profession}
        name={person?.name || playerName || '无名'}
        level={person?.level?.level ?? 1}
        exp={person?.level?.exp ?? 0}
        maxExp={person?.level?.maxExp ?? 100}
      />

      <div className={styles.scrollArea}>
        <section className={styles.hero}>
          <div className={styles.badges}>
            {notices.slice(0, 3).map((notice) => (
              <span
                key={notice}
                className={`${styles.badge} ${notice.includes('Boss') ? styles.badgeHot : ''}`.trim()}
              >
                {notice}
              </span>
            ))}
          </div>

          <button
            className={styles.namecard}
            onClick={() => navigateTo(primaryNpc.pageId, {
              ...pageContext,
              source: 'npc',
              npcId: primaryNpc.id,
              npcName: primaryNpc.name,
            })}
            type="button"
          >
            <div className={styles.namecardName}>{primaryNpc.name} · {primaryNpc.role}</div>
            <div className={styles.namecardSub}>{primaryNpc.line} {'>'}</div>
          </button>

          <div className={styles.heroText}>
            <div className={styles.heroTitle}>{place.landscape}</div>
            <div className={styles.heroSub}>{place.description}</div>
          </div>
        </section>

        <div className={styles.sect}>
          地 图
          <button className={styles.more} onClick={() => navigateTo('world-map')} type="button">
            更多 ›
          </button>
        </div>

        <div className={styles.compass}>
          {compass.map((cell) => {
            if (cell.state === 'empty') {
              return <div key={cell.slot} className={`${styles.compassCell} ${styles.empty}`} />;
            }

            const className = [
              styles.compassCell,
              cell.state === 'center' ? styles.center : '',
            ].join(' ').trim();

            if (cell.state === 'center') {
              return (
                <div key={cell.slot} className={className}>
                  <span>{cell.label}</span>
                  {cell.coord && <span className={styles.compassCoord}>{cell.coord}</span>}
                </div>
              );
            }

            return (
              <button
                key={cell.slot}
                className={className}
                disabled={moving}
                onClick={cell.action}
                type="button"
              >
                <span>{cell.label}</span>
                {cell.coord && <span className={styles.compassCoord}>{cell.coord}</span>}
              </button>
            );
          })}
        </div>

        <div className={styles.sect}>
          功 能
          <button className={styles.more} onClick={() => navigateTo('teleport')} type="button">
            更多 ›
          </button>
        </div>

        <div className={styles.menu4}>
          {quickActions.map((item) => (
            <button
              key={item.id}
              className={`${styles.menuItem} ${item.badge === 'hot' ? styles.hot : ''}`.trim()}
              onClick={() => navigateTo(item.pageId, {
                ...pageContext,
                source: 'hub',
                actionId: item.id,
              })}
              type="button"
            >
              <span className={styles.menuIcon}>{item.label.slice(0, 1)}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.sect}>
          附 近 玩 家
          <button className={styles.more} onClick={() => navigateTo('nearby')} type="button">
            更多 ›
          </button>
        </div>

        <div className={styles.nearby}>
          {nearby.length === 0 ? (
            <div className={styles.playerTag}>当前暂无玩家</div>
          ) : nearby.map((player) => (
            <button
              key={player.playerId}
              className={styles.playerTag}
              onClick={() => navigateTo('chat', { targetId: player.playerId, targetName: player.name })}
              type="button"
            >
              <span>{player.name}</span>
              <span className={styles.playerLevel}>Lv.{player.level}</span>
            </button>
          ))}
        </div>

        <BarBlock>
          <BarRow
            label="HP"
            kind="hp"
            current={person?.basicProperty?.hp ?? 0}
            max={person?.basicProperty?.hp ?? 1}
          />
          <BarRow
            label="MP"
            kind="mp"
            current={person?.basicProperty?.mp ?? 0}
            max={person?.basicProperty?.mp ?? 1}
          />
        </BarBlock>

        <div className={styles.sect}>
          场 景 情 报
        </div>

        <div className={styles.infoBlock}>
          <div className={styles.infoLine}>场景提示：{zone.sceneHint || place.title}</div>
          <div className={styles.infoLine}>当前活动：{notices[0] || '暂无限时活动'}</div>
          <div className={styles.infoLine}>可前往玩法：先移动到地方屏，再触发婚介、战斗、交易等功能。</div>
        </div>
      </div>
    </div>
  );
}
