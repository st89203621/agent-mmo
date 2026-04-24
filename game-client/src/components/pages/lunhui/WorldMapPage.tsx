import { useEffect, useState } from 'react';
import { fetchCurrentZone } from '../../../services/api';
import { WORLD_MAP_ORDER } from '../../../data/lunhuiWorld';
import { useGameStore } from '../../../store/gameStore';
import styles from './LunhuiPages.module.css';

const POSITIONS: Record<string, { left: string; top: string }> = {
  social_district: { left: '18%', top: '46%' },
  main_city: { left: '44%', top: '46%' },
  auction_lane: { left: '73%', top: '46%' },
  hunting_ground: { left: '46%', top: '78%' },
  snow_field: { left: '46%', top: '18%' },
  fishing_wharf: { left: '18%', top: '16%' },
  mystic_forge: { left: '74%', top: '80%' },
};

export default function WorldMapPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [currentZoneId, setCurrentZoneId] = useState('main_city');

  useEffect(() => {
    fetchCurrentZone().then((zone) => setCurrentZoneId(zone.zoneId)).catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>极北大陆 / 气盖山河区</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>世界地图</div>
          <div className={styles.subtitle}>你在此：{currentZoneId}</div>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.worldMap}>
          {WORLD_MAP_ORDER.map((node) => {
            const pos = POSITIONS[node.zoneId] || { left: '50%', top: '50%' };
            return (
              <button
                key={node.zoneId}
                className={`${styles.mapNode} ${currentZoneId === node.zoneId ? styles.mapNodeActive : ''}`}
                style={{ left: pos.left, top: pos.top }}
                onClick={() => navigateTo(node.zoneId === 'main_city' ? 'hub' : 'place', { zoneId: node.zoneId })}
              >
                <div className={styles.mapNodeTitle}>{node.title}</div>
                <div className={styles.mapNodeCoord}>({node.coord[0]},{node.coord[1]})</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
