import { useCallback, useEffect, useState } from 'react';
import { fetchCurrentZone, teleportToZone } from '../../../services/api';
import { WORLD_MAP_ORDER } from '../../../data/lunhuiWorld';
import { useGameStore } from '../../../store/gameStore';
import { toast } from '../../../store/toastStore';
import styles from './LunhuiPages.module.css';

const POSITIONS: Record<string, { left: string; top: string }> = {
  social_district: { left: '18%', top: '48%' },
  main_city: { left: '45%', top: '46%' },
  auction_lane: { left: '73%', top: '47%' },
  hunting_ground: { left: '46%', top: '77%' },
  snow_field: { left: '47%', top: '17%' },
  fishing_wharf: { left: '19%', top: '18%' },
  mystic_forge: { left: '74%', top: '78%' },
};

export default function WorldMapPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [currentZoneId, setCurrentZoneId] = useState('main_city');
  const [movingZoneId, setMovingZoneId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentZone().then((zone) => setCurrentZoneId(zone.zoneId)).catch(() => {});
  }, []);

  const handleTravel = useCallback(async (zoneId: string) => {
    if (movingZoneId) return;
    setMovingZoneId(zoneId);
    try {
      const nextZone = await teleportToZone(zoneId);
      setCurrentZoneId(nextZone.zoneId);
      toast.success(`已到达 ${nextZone.name}`);
      navigateTo(nextZone.zoneId === 'main_city' ? 'hub' : 'place', {
        zoneId: nextZone.zoneId,
        zoneName: nextZone.name,
        source: 'world-map',
      });
    } catch {
      toast.error('移动失败');
    } finally {
      setMovingZoneId(null);
    }
  }, [movingZoneId, navigateTo]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>世 界 地 图</span>
            <span className={styles.appbarZone}>你当前位于 {WORLD_MAP_ORDER.find((item) => item.zoneId === currentZoneId)?.title || currentZoneId}</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('hub')} type="button">主</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('teleport')} type="button">传</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.mapStage}>
          {WORLD_MAP_ORDER.map((node) => {
            const pos = POSITIONS[node.zoneId] || { left: '50%', top: '50%' };
            const active = currentZoneId === node.zoneId;
            return (
              <button
                key={node.zoneId}
                className={`${styles.mapPoint} ${active ? styles.mapPointActive : ''}`.trim()}
                style={{ left: pos.left, top: pos.top }}
                disabled={!!movingZoneId}
                onClick={() => handleTravel(node.zoneId)}
                type="button"
              >
                <div className={styles.mapPointTitle}>{node.title}</div>
                <div className={styles.mapPointCoord}>({node.coord[0]},{node.coord[1]})</div>
              </button>
            );
          })}
        </div>

        <div className={styles.sectLine}>地 图 节 点</div>
        <div className={styles.placeList}>
          {WORLD_MAP_ORDER.map((node) => (
            <button
              key={node.zoneId}
              className={styles.placeRow}
              disabled={!!movingZoneId}
              onClick={() => handleTravel(node.zoneId)}
              type="button"
            >
              <div className={styles.placeIcon}>{node.title.slice(0, 1)}</div>
              <div className={styles.placeBody}>
                <div className={styles.placeRowName}>{node.region} · {node.title}</div>
                <div className={styles.placeRowTip}>坐标 ({node.coord[0]},{node.coord[1]}) · {node.description}</div>
              </div>
              <div className={styles.placeRowGo}>
                {movingZoneId === node.zoneId ? '移 动' : node.zoneId === currentZoneId ? '当 前' : '前 往'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
