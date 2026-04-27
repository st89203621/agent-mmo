import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import { fetchCheckinStatus, doCheckin } from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface CheckinReward {
  day: number;
  name: string;
  qty: string;
}

const WEEK_REWARDS: CheckinReward[] = [
  { day: 1, name: '玩 币', qty: '× 20' },
  { day: 2, name: '经 验 丹', qty: '× 3' },
  { day: 3, name: '鬼 火', qty: '× 10' },
  { day: 4, name: '代 练 卡', qty: '× 1' },
  { day: 5, name: '附 魂 石', qty: '× 2' },
  { day: 6, name: '双 经 卡', qty: '× 1' },
];

const BIG_REWARD: CheckinReward = {
  day: 7,
  name: '钻 石 VIP 月 卡 × 1',
  qty: '+ 神 宠 抽 券 × 1',
};

const MILESTONES: { days: number; reward: string; note: string }[] = [
  { days: 15, reward: '累 签 15 日 · 神 材 × 1', note: '每 赛 季 一 次' },
  { days: 30, reward: '累 签 30 日 · 神 宠 自 选 券', note: '永 久 收 藏' },
  { days: 100, reward: '累 签 100 日 · 流 光 称 号', note: '专 属 称 号' },
];

interface CheckinStatus {
  todayChecked: boolean;
  consecutiveDays: number;
  totalDays: number;
}

export default function CheckinPage() {
  usePageBackground(PAGE_BG.CHECKIN);
  const back = useGameStore((s) => s.back);
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [doing, setDoing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchCheckinStatus();
      setStatus(data);
    } catch {
      /* noop */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClaim = useCallback(async () => {
    if (status?.todayChecked || doing) return;
    setDoing(true);
    try {
      const res = await doCheckin();
      setStatus({
        todayChecked: res.todayChecked,
        consecutiveDays: res.consecutiveDays,
        totalDays: res.totalDays,
      });
      toast.reward(res.reward || '签到成功');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '签到失败');
    }
    setDoing(false);
  }, [status, doing]);

  const consecutive = status?.consecutiveDays ?? 0;
  const total = status?.totalDays ?? 0;
  const todayDay = status?.todayChecked
    ? Math.min(consecutive, 7)
    : Math.min(consecutive + 1, 7);

  const dayState = (day: number): 'done' | 'today' | 'pending' => {
    if (day < todayDay) return 'done';
    if (day === todayDay && !status?.todayChecked) return 'today';
    if (day === todayDay && status?.todayChecked) return 'done';
    return 'pending';
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>七 日 签 到</span>
            <span className={styles.appbarZone}>
              已 签 {consecutive} / 7 · 累 签 {total} 日
            </span>
          </div>
          <div className={styles.appbarIcons}>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => back()}
              aria-label="返回"
            >
              回
            </button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.sgHero}>
          <div className={styles.sgHeroEy}>本 周 · 已 签 {Math.min(consecutive, 7)} 天</div>
          <div className={styles.sgHeroT}>⚜ 签 到 得 礼 ⚜</div>
          <div className={styles.sgHeroSub}>累 签 7 日 · 钻 石 VIP 月 卡 × 1</div>
        </div>

        <div className={styles.sgCal}>
          {WEEK_REWARDS.map((r) => {
            const st = dayState(r.day);
            const cls =
              st === 'done' ? styles.sgDDone : st === 'today' ? styles.sgDToday : '';
            return (
              <div key={r.day} className={`${styles.sgD} ${cls}`.trim()}>
                <div className={styles.sgDt}>DAY {r.day}</div>
                <div className={styles.sgRw}>{r.name}</div>
                <div className={styles.sgQty}>{r.qty}</div>
              </div>
            );
          })}
          {(() => {
            const st = dayState(7);
            const cls =
              st === 'done' ? styles.sgDDone : st === 'today' ? styles.sgDToday : '';
            return (
              <div className={`${styles.sgD} ${styles.sgDBig} ${cls}`.trim()}>
                <div className={styles.sgDt}>DAY 7 · 大 礼</div>
                <div className={styles.sgRw}>{BIG_REWARD.name}</div>
                <div className={styles.sgQty}>{BIG_REWARD.qty}</div>
              </div>
            );
          })()}
        </div>

        <div className={styles.sgMile}>
          <div className={styles.sgMileH}>— 累 签 里 程 碑 —</div>
          {MILESTONES.map((m) => {
            const reached = total >= m.days;
            return (
              <div key={m.days} className={styles.sgMileRow}>
                <div className={styles.sgMileAv}>{m.days}</div>
                <div className={styles.sgMileBd}>
                  <div className={styles.sgMileNm}>{m.reward}</div>
                  <div className={styles.sgMileBf}>
                    {reached
                      ? `已 达 成 · 累 签 ${total}`
                      : `进 度 ${total} / ${m.days} · 缺 ${m.days - total}`}
                  </div>
                </div>
                <div className={styles.sgMileTm}>{reached ? '已 领' : '进 行'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className={styles.sgClaim}
        disabled={loading || doing || (status?.todayChecked ?? false)}
        onClick={handleClaim}
      >
        {loading
          ? '加 载 中 ...'
          : doing
            ? '签 到 中 ...'
            : status?.todayChecked
              ? '今 日 已 签'
              : '今 日 签 到 · 立 即 领 取'}
      </button>
    </div>
  );
}
