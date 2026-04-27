import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';

interface DayCell {
  n: number;
  gift: string;
  claimed: boolean;
  today: boolean;
}

// TODO: 接入 /monthly-card/state 与 /monthly-card/claim 接口
const STATE = {
  remainDays: 18,
  totalDays: 30,
  totalDiamond: 1880,
  totalGift: 12,
};

const DAYS: DayCell[] = Array.from({ length: 30 }, (_, i) => ({
  n: i + 1,
  gift: i === 6 || i === 13 || i === 20 || i === 29 ? '宝' : '玉',
  claimed: i < 12,
  today: i === 12,
}));

export default function MonthlyCardPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>玄 玉 月 卡</span>
            <span className={styles.appbarZone}>三 旬 渐 进 · 日 日 有 礼</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.mcHero}>
          <div className={styles.mcCardIc}>玄</div>
          <div className={styles.mcT}>玄 玉 月 卡</div>
          <div className={styles.mcS}>剩 余 {STATE.remainDays} / {STATE.totalDays} 日</div>
        </div>

        <div className={styles.mcStat}>
          <div>
            <div className={styles.mcStatV}>{STATE.totalDiamond}</div>
            <div className={styles.mcStatL}>累 计 玉 璧</div>
          </div>
          <div>
            <div className={styles.mcStatV}>{STATE.totalGift}</div>
            <div className={styles.mcStatL}>领 取 礼 包</div>
          </div>
          <div>
            <div className={styles.mcStatV}>+ 30%</div>
            <div className={styles.mcStatL}>经 验 加 成</div>
          </div>
        </div>

        <div className={styles.sectLine}>每 日 礼 包</div>

        <div className={styles.mcDayGrid}>
          {DAYS.map((d) => {
            const cls = d.today ? styles.mcDayToday : d.claimed ? styles.mcDayClaimed : '';
            return (
              <div key={d.n} className={`${styles.mcDay} ${cls}`.trim()}>
                <div className={styles.mcDayN}>{d.n}</div>
                <span className={styles.mcDayG}>{d.gift}</span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.mcBuy}
          onClick={() => toast.info('已 跳 转 充 值 中 心')}
        >
          续 卡 · 30 玉 璧
        </button>
      </div>
    </div>
  );
}
