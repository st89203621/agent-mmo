import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCurrentZone, moveToZone } from '../../../services/api';
import { getPlaceInfo } from '../../../data/lunhuiWorld';
import { useGameStore } from '../../../store/gameStore';
import { toast } from '../../../store/toastStore';
import type { PlaceInfo, ZoneInfo } from '../../../types';
import styles from './LunhuiPages.module.css';

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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>{place.region}</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>{place.title}</div>
          <div className={styles.subtitle}>({place.coord[0]},{place.coord[1]})</div>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.hero}>
          <div className={styles.heroTitle}>{place.landscape}</div>
          <div className={styles.heroSub}>{place.description}</div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>场景告示</span>
            <span className={styles.chip}>地方屏</span>
          </div>
          <div className={styles.list}>
            {place.notices.map((notice) => (
              <div key={notice} className={styles.card}>
                <div className={styles.name}>{notice}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>场景人物</span>
          </div>
          <div className={styles.list}>
            {place.npcs.map((npc) => (
              <div key={npc.id} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.stack}>
                    <div className={styles.name}>{npc.name}</div>
                    <div className={styles.meta}>{npc.role}</div>
                  </div>
                  <button className={styles.button} onClick={() => navigateTo(npc.pageId)}>
                    前往
                  </button>
                </div>
                <div className={styles.desc}>{npc.line}</div>
              </div>
            ))}
          </div>
        </div>

        {place.monsters.length > 0 && (
          <div className={styles.panel}>
            <div className={styles.panelTitle}>
              <span>出没怪物</span>
            </div>
            <div className={styles.list}>
              {place.monsters.map((monster) => (
                <div key={monster.id} className={styles.card}>
                  <div className={styles.row}>
                    <div className={styles.stack}>
                      <div className={styles.name}>{monster.name}</div>
                      <div className={styles.meta}>Lv.{monster.level} · {monster.reward}</div>
                    </div>
                    <button className={styles.button} onClick={() => navigateTo(monster.pageId)}>
                      迎战
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>出口 · 方位</span>
          </div>
          <div className={styles.grid2}>
            {place.exits.map((target) => (
              <button
                key={target.targetZoneId}
                className={`${styles.button} ${styles.buttonAlt}`}
                onClick={() => handleMove(target.targetZoneId)}
                disabled={moving}
              >
                {target.direction} · {target.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grid2}>
          <button className={`${styles.button} ${styles.buttonAlt}`} onClick={() => navigateTo('hub')}>
            返回主城
          </button>
          <button className={styles.button} onClick={() => navigateTo('world-map')}>
            查看地图
          </button>
        </div>
      </div>
    </div>
  );
}
