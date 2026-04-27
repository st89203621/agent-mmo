import { useEffect, useState } from 'react';
import { fetchCurrentZone, fetchNearbyPlayers } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import type { NearbyPlayer } from '../../../types';
import styles from './LunhuiPages.module.css';
import { usePageBackground } from '../../common/PageShell';
import { PAGE_BG } from '../../../data/pageBackgrounds';

export default function NearbyPage() {
  usePageBackground(PAGE_BG.NEARBY);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [zoneName, setZoneName] = useState('主城');
  const [players, setPlayers] = useState<NearbyPlayer[]>([]);

  useEffect(() => {
    fetchCurrentZone().then((zone) => setZoneName(zone.name)).catch(() => {});
    fetchNearbyPlayers().then((res) => setPlayers(res.players || [])).catch(() => setPlayers([]));
  }, []);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>四 周</span>
            <span className={styles.appbarZone}>{zoneName} · 在线玩家 {players.length}</span>
          </div>
          <div className={styles.appbarIcons}>
            <div className={styles.appbarIconPlain}>搜</div>
            <div className={styles.appbarIconPlain}>档</div>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.friendList}>
          {players.length === 0 ? (
            <div className={styles.feedEmpty}>当前区域暂时没有其他玩家</div>
          ) : players.map((player) => (
            <div key={player.playerId} className={styles.friendRow}>
              <div className={styles.friendAvatar}>{player.name.slice(0, 1)}</div>
              <div className={styles.friendInfo}>
                <div className={styles.friendName}>
                  <span className={`${styles.friendStatus} ${styles.friendStatusOn}`} />
                  {player.name}
                </div>
                <div className={styles.friendMeta}>Lv.{player.level} · {player.zoneId}</div>
                <div className={styles.friendIntro}>可加友，可私聊，也可继续查看其相关动向。</div>
              </div>
              <div className={styles.friendActions}>
                <button className={styles.friendAction} onClick={() => navigateTo('friend')} type="button">加友</button>
                <button className={styles.friendAction} onClick={() => navigateTo('chat', { targetId: player.playerId, targetName: player.name })} type="button">私聊</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
