import { useEffect, useState } from 'react';
import { fetchCurrentZone, fetchNearbyPlayers } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import type { NearbyPlayer } from '../../../types';
import styles from './LunhuiPages.module.css';

export default function NearbyPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [zoneName, setZoneName] = useState('主城');
  const [players, setPlayers] = useState<NearbyPlayer[]>([]);

  useEffect(() => {
    fetchCurrentZone().then((zone) => setZoneName(zone.name)).catch(() => {});
    fetchNearbyPlayers().then((res) => setPlayers(res.players || [])).catch(() => setPlayers([]));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>同区域在线玩家</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>四周</div>
          <div className={styles.subtitle}>{zoneName}</div>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>附近侠客</span>
            <span className={styles.chip}>{players.length} 人在线</span>
          </div>
          <div className={styles.list}>
            {players.length === 0 ? (
              <div className={styles.empty}>当前区域暂无其他玩家</div>
            ) : players.map((player) => (
              <div key={player.playerId} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.stack}>
                    <div className={styles.name}>{player.name}</div>
                    <div className={styles.meta}>Lv.{player.level} · {player.zoneId}</div>
                  </div>
                  <div className={styles.tabs}>
                    <button className={styles.tab} onClick={() => navigateTo('friend')}>加友</button>
                    <button className={styles.tab} onClick={() => navigateTo('chat', { targetId: player.playerId, targetName: player.name })}>私聊</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
