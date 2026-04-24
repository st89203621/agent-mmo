import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCurrentZone, moveToZone } from '../../../services/api';
import { getPlaceInfo } from '../../../data/lunhuiWorld';
import { useGameStore } from '../../../store/gameStore';
import { toast } from '../../../store/toastStore';
import type { PlaceInfo, ZoneInfo } from '../../../types';
import styles from './LunhuiPages.module.css';

type PlaceCompassSlot = 'nw' | 'n' | 'ne' | 'w' | 'center' | 'e' | 'sw' | 's' | 'se';

interface PlaceCompassCell {
  slot: PlaceCompassSlot;
  label: string;
  coord?: string;
  action?: () => void;
  state: 'empty' | 'here' | 'exit';
}

const PLACE_ORDER: PlaceCompassSlot[] = ['nw', 'n', 'ne', 'w', 'center', 'e', 'sw', 's', 'se'];

function getSlot(dx: number, dy: number): PlaceCompassSlot | null {
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

export default function PlacePage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const pageZoneId = useGameStore((s) => String(s.pageParams.zoneId || ''));
  const [zone, setZone] = useState<ZoneInfo | null>(null);
  const [moving, setMoving] = useState(false);

  const loadZone = useCallback(async () => {
    try {
      const data = await fetchCurrentZone();
      setZone(data);
    } catch {
      setZone(null);
    }
  }, []);

  useEffect(() => {
    loadZone();
  }, [loadZone]);

  const place: PlaceInfo = useMemo(() => getPlaceInfo(pageZoneId || zone?.zoneId || 'main_city'), [pageZoneId, zone]);

  const handleMove = useCallback(async (targetZoneId: string) => {
    if (moving) return;
    setMoving(true);
    try {
      const nextZone = await moveToZone(targetZoneId);
      setZone(nextZone);
      toast.success(`已到达 ${nextZone.name}`);
      navigateTo('place', { zoneId: nextZone.zoneId });
    } catch {
      toast.error('移动失败');
    } finally {
      setMoving(false);
    }
  }, [moving, navigateTo]);

  const compass = useMemo<PlaceCompassCell[]>(() => {
    const cells = new Map<PlaceCompassSlot, PlaceCompassCell>();
    cells.set('center', {
      slot: 'center',
      label: '你 在 此',
      coord: `(${place.coord[0]},${place.coord[1]})`,
      state: 'here',
    });

    for (const exit of place.exits) {
      const target = getPlaceInfo(exit.targetZoneId);
      const slot = getSlot(target.coord[0] - place.coord[0], target.coord[1] - place.coord[1]);
      if (!slot) continue;
      cells.set(slot, {
        slot,
        label: target.title,
        coord: `(${target.coord[0]},${target.coord[1]})`,
        action: () => handleMove(exit.targetZoneId),
        state: 'exit',
      });
    }

    return PLACE_ORDER.map((slot) => cells.get(slot) ?? {
      slot,
      label: '',
      coord: undefined,
      action: undefined,
      state: 'empty',
    });
  }, [handleMove, place]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>{place.region} · {place.title}</span>
            <span className={styles.appbarZone}>坐标 ({place.coord[0]},{place.coord[1]})</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('chat')} type="button">叫</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('hub')} type="button">退</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.placeBg}>
          <div className={styles.placeInk}>{place.title.slice(0, 1)}</div>
          <div className={styles.placeText}>
            <div className={styles.placeName}>{place.region} · {place.title}</div>
            <div className={styles.placeCoord}>坐 标 ({place.coord[0]},{place.coord[1]})</div>
            <div className={styles.placeMood}>{place.landscape}</div>
          </div>
        </div>

        <div className={styles.sectLine}>
          出 口 · 方 位
          <button className={styles.moreBtn} onClick={() => navigateTo('teleport')} type="button">点击传送 ›</button>
        </div>

        <div className={styles.placeCompass}>
          {compass.map((cell) => {
            if (cell.state === 'empty') {
              return <div key={cell.slot} className={`${styles.placeCell} ${styles.placeCellEmpty}`} />;
            }
            if (cell.state === 'here') {
              return (
                <div key={cell.slot} className={`${styles.placeCell} ${styles.placeCellHere}`}>
                  <span>{cell.label}</span>
                  {cell.coord && <span className={styles.placeCellCoord}>{cell.coord}</span>}
                </div>
              );
            }
            return (
              <button
                key={cell.slot}
                className={styles.placeCell}
                disabled={moving}
                onClick={cell.action}
                type="button"
              >
                <span>{cell.label}</span>
                {cell.coord && <span className={styles.placeCellCoord}>{cell.coord}</span>}
              </button>
            );
          })}
        </div>

        {place.npcs.length > 0 && (
          <>
            <div className={styles.sectLine}>N P C · 在 此 可 对 话</div>
            <div className={styles.placeList}>
              {place.npcs.map((npc) => (
                <button
                  key={npc.id}
                  className={styles.placeRow}
                  onClick={() => navigateTo(npc.pageId)}
                  type="button"
                >
                  <div className={styles.placeIcon}>{npc.name.slice(0, 1)}</div>
                  <div className={styles.placeBody}>
                    <div className={styles.placeRowName}>{npc.name}</div>
                    <div className={styles.placeRowTip}>{npc.role} · {npc.line}</div>
                  </div>
                  <div className={styles.placeRowGo}>前 往</div>
                </button>
              ))}
            </div>
          </>
        )}

        {place.monsters.length > 0 && (
          <>
            <div className={styles.sectLine}>出 没 怪 物 · 可 战</div>
            <div className={styles.placeList}>
              {place.monsters.map((monster) => (
                <button
                  key={monster.id}
                  className={`${styles.placeRow} ${styles.placeRowMob}`}
                  onClick={() => navigateTo(monster.pageId)}
                  type="button"
                >
                  <div className={styles.placeIcon}>{monster.name.slice(0, 1)}</div>
                  <div className={styles.placeBody}>
                    <div className={styles.placeRowName}>{monster.name}</div>
                    <div className={styles.placeRowTip}>Lv.{monster.level} · {monster.reward}</div>
                  </div>
                  <div className={styles.placeRowGo}>迎 战</div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className={styles.placeAct}>★ {place.notices[0] || '此地安宁，暂无异动'}</div>
      </div>
    </div>
  );
}
