import { useCallback, useEffect, useState } from 'react';
import { addFriend, fetchFriends, removeFriend } from '../../../services/api';
import type { FriendProfile } from '../../../types';
import styles from './LunhuiPages.module.css';

export default function FriendPage() {
  const [friends, setFriends] = useState<FriendProfile[]>([]);

  const load = useCallback(() => {
    fetchFriends().then((res) => setFriends(res.friends || [])).catch(() => setFriends([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>玩友 / 社交</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>玩友</div>
          <div className={styles.subtitle}>{friends.length} 位</div>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>好友列表</span>
            <button className={styles.tab} onClick={() => addFriend(10001).then(load)}>添加示例好友</button>
          </div>
          <div className={styles.list}>
            {friends.length === 0 ? (
              <div className={styles.empty}>当前还没有玩友，先去四周或婚介结识一些人吧。</div>
            ) : friends.map((friend) => (
              <div key={friend.playerId} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.stack}>
                    <div className={styles.name}>{friend.name}</div>
                    <div className={styles.meta}>Lv.{friend.level} · {friend.lastSeen}</div>
                  </div>
                  <button className={`${styles.button} ${styles.buttonAlt}`} onClick={() => removeFriend(friend.playerId).then(load)}>
                    删除
                  </button>
                </div>
                {friend.intro && <div className={styles.desc}>{friend.intro}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
