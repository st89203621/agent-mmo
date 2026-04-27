import { useCallback, useEffect, useState } from 'react';
import { claimOnlineReward, fetchOnlineRewards, type OnlineRewardData } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import { toast } from '../../../store/toastStore';
import type { PageId } from '../../../types';
import styles from './LunhuiPages.module.css';
import { usePageBackground } from '../../common/PageShell';
import { PAGE_BG } from '../../../data/pageBackgrounds';

interface QuickEntry {
  label: string;
  icon: string;
  desc: string;
  pageId: PageId;
}

const QUICK_ENTRIES: QuickEntry[] = [
  { label: '天降神宠', icon: '轮', desc: '每日限时 · 稀有宠物掉落', pageId: 'wheel' },
  { label: '世界 Boss', icon: '狩', desc: '每日 20:00 开放', pageId: 'world-boss' },
  { label: '等级排行', icon: '榜', desc: '周末结算豪礼', pageId: 'ranking' },
  { label: '活动留言', icon: '言', desc: '参与讨论 · 瓜分金币', pageId: 'message-board' },
];

export default function EventsPage() {
  usePageBackground(PAGE_BG.EVENTS);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [rewards, setRewards] = useState<OnlineRewardData[]>([]);
  const [onlineMinutes, setOnlineMinutes] = useState(0);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOnlineRewards();
      setRewards(res.rewards || []);
      setOnlineMinutes(res.onlineMinutes || 0);
    } catch {
      setRewards([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClaim = useCallback(async (reward: OnlineRewardData) => {
    setClaiming(reward.rewardId);
    try {
      await claimOnlineReward(reward.rewardId);
      toast.reward(`领取 · ${reward.rewardDesc}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '领取失败');
    }
    setClaiming(null);
  }, [load]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>活 动 中 心</span>
            <span className={styles.appbarZone}>限时活动 · 在线领奖</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={load} type="button" aria-label="刷新">⟳</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('mail')} type="button" aria-label="邮件">邮</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.evtHero}>
          <div className={styles.evtHeroRow}>
            <div>
              <div className={styles.evtHeroTitle}>本 日 活 动</div>
              <div className={styles.evtHeroSub}>参与活动领取每日豪礼 · 榜单结算</div>
            </div>
            <div className={styles.evtHeroOnline}>
              <span className={styles.evtHeroOnlineV}>{onlineMinutes}</span>分钟
            </div>
          </div>
        </div>

        <div className={styles.sectRow}>
          当 前 活 动
          <span className={styles.sectMore}>{QUICK_ENTRIES.length} 项</span>
        </div>
        <div className={styles.evtGrid}>
          {QUICK_ENTRIES.map((entry) => (
            <button
              key={entry.label}
              className={styles.evtCard}
              onClick={() => navigateTo(entry.pageId)}
              type="button"
            >
              <span className={styles.evtCardIcon}>{entry.icon}</span>
              {entry.label}
              <span className={styles.evtCardSub}>{entry.desc}</span>
            </button>
          ))}
        </div>

        <div className={styles.sectRow}>
          在 线 领 奖
          <span className={styles.sectMore}>{rewards.length} 项</span>
        </div>
        {loading ? (
          <div className={styles.feedEmpty}>奖励信息载入中...</div>
        ) : rewards.length === 0 ? (
          <div className={styles.feedEmpty}>暂无可领取奖励</div>
        ) : (
          rewards.map((reward) => {
            const state = reward.claimed ? 'claimed' : reward.available ? 'ready' : 'locked';
            return (
              <div
                key={reward.rewardId}
                className={[
                  styles.evtReward,
                  state === 'ready' ? styles.evtRewardReady : '',
                  state === 'claimed' ? styles.evtRewardClaimed : '',
                ].filter(Boolean).join(' ')}
              >
                <div className={styles.evtRewardDot}>{reward.requiredMinutes}</div>
                <div className={styles.evtRewardBody}>
                  <div className={styles.evtRewardName}>{reward.label}</div>
                  <div className={styles.evtRewardDesc}>{reward.rewardDesc}</div>
                </div>
                <button
                  className={styles.evtRewardBtn}
                  onClick={() => handleClaim(reward)}
                  disabled={reward.claimed || !reward.available || claiming === reward.rewardId}
                  type="button"
                >
                  {reward.claimed ? '已 领'
                    : claiming === reward.rewardId ? '...'
                    : reward.available ? '领 取' : '未达成'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
