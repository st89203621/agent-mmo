import { useCallback, useEffect, useState } from 'react';
import { claimOnlineReward, fetchOnlineRewards } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import styles from './LunhuiPages.module.css';

interface Reward {
  rewardId: string;
  label: string;
  rewardDesc: string;
  claimed: boolean;
  available: boolean;
}

const quickEntries = [
  { label: '天降神宠', pageId: 'wheel' },
  { label: '世界 Boss', pageId: 'world-boss' },
  { label: '等级排行', pageId: 'ranking' },
  { label: '活动留言', pageId: 'message-board' },
] as const;

export default function EventsPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [onlineMinutes, setOnlineMinutes] = useState(0);

  const load = useCallback(() => {
    fetchOnlineRewards().then((res) => {
      setRewards(res.rewards || []);
      setOnlineMinutes(res.onlineMinutes || 0);
    }).catch(() => setRewards([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>限时活动 / 在线领奖</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>活动中心</div>
          <div className={styles.subtitle}>在线 {onlineMinutes} 分钟</div>
        </div>
      </div>
      <div className={styles.scroll}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>当前活动</span>
          </div>
          <div className={styles.grid2}>
            {quickEntries.map((entry) => (
              <button key={entry.label} className={styles.button} onClick={() => navigateTo(entry.pageId)}>
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>在线领奖</span>
          </div>
          <div className={styles.list}>
            {rewards.map((reward) => (
              <div key={reward.rewardId} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.stack}>
                    <div className={styles.name}>{reward.label}</div>
                    <div className={styles.meta}>{reward.rewardDesc}</div>
                  </div>
                  <button
                    className={`${styles.button} ${reward.claimed ? styles.buttonAlt : ''}`}
                    disabled={reward.claimed || !reward.available}
                    onClick={() => claimOnlineReward(reward.rewardId).then(load)}
                  >
                    {reward.claimed ? '已领' : reward.available ? '领取' : '未达成'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
