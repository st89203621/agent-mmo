import type { CSSProperties } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface ApStat {
  v: number;
  l: string;
  cls: string;
}

// TODO: 接入 /soul/state 与 /soul/attach 接口
const POOL = { current: 6420, max: 10000 };

const STATS: ApStat[] = [
  { v: 28, l: '攻 击', cls: 'apStatsVRed' },
  { v: 36, l: '灵 力', cls: 'apStatsVAzure' },
  { v: 22, l: '生 命', cls: 'apStatsVJade' },
  { v: 14, l: '神 识', cls: 'apStatsVPurple' },
];

const ACTS: { key: string; label: string; icon: string; danger?: boolean }[] = [
  { key: 'attach', label: '附 魂', icon: '附' },
  { key: 'extract', label: '抽 离', icon: '抽' },
  { key: 'forge', label: '凝 炼', icon: '炼' },
  { key: 'shatter', label: '碎 魂', icon: '碎', danger: true },
];

const apStatsValueClass: Record<string, string> = {
  apStatsVRed: styles.apStatsVRed,
  apStatsVAzure: styles.apStatsVAzure,
  apStatsVJade: styles.apStatsVJade,
  apStatsVPurple: styles.apStatsVPurple,
};

export default function SoulAttachPage() {
  usePageBackground(PAGE_BG.SOUL_ATTACH);
  const back = useGameStore((s) => s.back);
  const pct = Math.min(100, Math.round((POOL.current / POOL.max) * 100));

  const handleAct = (key: string) => {
    if (key === 'shatter') {
      toast.error('碎 魂 不 可 复 原 · 谨 慎 操 作');
      return;
    }
    toast.info('魂 池 涟 漪 · 操 作 已 记 录');
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>附 魂 池</span>
            <span className={styles.appbarZone}>魂 力 灌 注 · 神 兵 觉 醒</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => back()}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.apPool}>
          <div className={styles.apRing} style={{ '--p': pct } as CSSProperties}>
            <div className={styles.apRingInner}>
              <div className={styles.apRingV}>{POOL.current.toLocaleString()}</div>
              <div className={styles.apRingMx}>/ {POOL.max.toLocaleString()}</div>
              <div className={styles.apRingLb}>魂 池 充 盈</div>
            </div>
          </div>
          <div className={styles.apTip}>每 时 辰 自 然 凝 聚 + 12 魂 力</div>
        </div>

        <div className={styles.apStats}>
          {STATS.map((s, i) => (
            <div key={i}>
              <div className={`${styles.apStatsV} ${apStatsValueClass[s.cls]}`}>+ {s.v}</div>
              <div className={styles.apStatsL}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.apActs}>
        {ACTS.map((a) => (
          <button
            key={a.key}
            type="button"
            className={`${styles.apActBtn} ${a.danger ? styles.apActBtnRed : ''}`.trim()}
            onClick={() => handleAct(a.key)}
          >
            <span className={styles.apActBtnI}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
