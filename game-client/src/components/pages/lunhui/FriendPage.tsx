import { useCallback, useEffect, useMemo, useState } from 'react';
import { addFriend, fetchFriends, removeFriend } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import type { FriendProfile } from '../../../types';
import styles from './LunhuiPages.module.css';
import { usePageBackground } from '../../common/PageShell';
import { PAGE_BG } from '../../../data/pageBackgrounds';

export default function FriendPage() {
  usePageBackground(PAGE_BG.FRIEND);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [keyword, setKeyword] = useState('');

  const load = useCallback(() => {
    fetchFriends().then((res) => setFriends(res.friends || [])).catch(() => setFriends([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleFriends = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    if (!value) return friends;
    return friends.filter((friend) => friend.name.toLowerCase().includes(value));
  }, [friends, keyword]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>玩 友 录</span>
            <span className={styles.appbarZone}>在线 {friends.length} · 社交往来</span>
          </div>
          <div className={styles.appbarIcons}>
            <div className={`${styles.appbarIconPlain} ${styles.appbarIconDot}`}>申</div>
            <button className={styles.appbarIcon} onClick={() => addFriend(10001).then(load)} type="button">＋</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.friendSearch}>
          <input
            className={styles.friendSearchInput}
            placeholder="搜索玩家名"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button className={styles.friendSearchBtn} onClick={() => addFriend(10001).then(load)} type="button">
            添 加
          </button>
        </div>

        <div className={styles.friendList}>
          {visibleFriends.length === 0 ? (
            <div className={styles.feedEmpty}>当前还没有玩友，先去附近玩家或婚介里结识一些人吧。</div>
          ) : visibleFriends.map((friend) => (
            <div key={friend.playerId} className={styles.friendRow}>
              <div className={styles.friendAvatar}>{friend.name.slice(0, 1)}</div>
              <div className={styles.friendInfo}>
                <div className={styles.friendName}>
                  <span className={`${styles.friendStatus} ${styles.friendStatusOn}`} />
                  {friend.name}
                </div>
                <div className={styles.friendMeta}>
                  Lv.{friend.level} · {friend.zoneId || '主城'} · {friend.lastSeen}
                </div>
                {friend.intro && <div className={styles.friendIntro}>{friend.intro}</div>}
              </div>
              <div className={styles.friendActions}>
                <button className={styles.friendAction} onClick={() => navigateTo('chat', { targetId: friend.playerId, targetName: friend.name })} type="button">聊</button>
                <button className={styles.friendAction} onClick={() => navigateTo('matchmaking')} type="button">邀</button>
                <button className={styles.friendAction} onClick={() => navigateTo('nearby')} type="button">档</button>
                <button className={`${styles.friendAction} ${styles.friendActionRed}`} onClick={() => removeFriend(friend.playerId).then(load)} type="button">删</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
