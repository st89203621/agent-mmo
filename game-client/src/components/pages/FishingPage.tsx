import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface FishCatch {
  id: string;
  icon: string;
  name: string;
  weight: string;
  count: number;
  value: string;
  rarity?: 'rare' | 'ur';
  action: string;
}

interface Tool {
  icon: string;
  name: string;
  desc: string;
  status: string;
}

// TODO: 接入 /fishing/catch 接口
const INITIAL_CATCH: FishCatch[] = [
  { id: 'c1', icon: '鲤', name: '红尾鲤鱼', weight: '1.2 斤', count: 3, value: '+ 36 币', action: '12 币 / 条' },
  { id: 'c2', icon: '鲫', name: '银鳞鲫鱼', weight: '0.5 斤', count: 7, value: '+ 35 币', action: '5 币 / 条' },
  { id: 'c3', icon: '玄', name: '玄武龟', weight: '3.8 斤', count: 1, value: '保 留', rarity: 'rare', action: '炼丹材料' },
  { id: 'c4', icon: '鲲', name: '鲲鹏之子', weight: '25.6 斤', count: 1, value: '炫 耀', rarity: 'ur', action: '全区第 2 条' },
];

const TOOLS: Tool[] = [
  { icon: '饵', name: '墨鱼骨 饵', desc: '稀有率 +15% · 商城 50 币 / 包', status: '剩 8' },
  { icon: '竿', name: '精钢鱼竿 · +8', desc: '上钩率 +22% · 神匠处升级', status: '装备中' },
];

export default function FishingPage() {
  usePageBackground(PAGE_BG.FISHING);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [bait, setBait] = useState(8);
  const [biting, setBiting] = useState(false);
  const [today, setToday] = useState(14);
  const [rare, setRare] = useState(3);
  const limit = 50;
  const biteTimer = useRef<number | null>(null);

  const triggerBite = useCallback(() => {
    if (bait <= 0) return;
    biteTimer.current = window.setTimeout(() => setBiting(true), 1800 + Math.random() * 2200);
  }, [bait]);

  useEffect(() => {
    triggerBite();
    return () => {
      if (biteTimer.current) window.clearTimeout(biteTimer.current);
    };
  }, [triggerBite]);

  const handleHook = () => {
    if (!biting) {
      toast.error('未到提竿时机');
      return;
    }
    setBiting(false);
    setBait((b) => Math.max(0, b - 1));
    setToday((t) => t + 1);
    if (Math.random() < 0.18) {
      setRare((r) => r + 1);
      toast.reward('钓 起 稀 有 鱼');
    } else {
      toast.info('+ 1 条 鲤 鱼');
    }
    triggerBite();
  };

  const handleSwapBait = () => {
    if (bait >= 8) {
      toast.info('鱼 饵 已 满');
      return;
    }
    setBait((b) => Math.min(8, b + 5));
    toast.info('换 上 新 饵');
  };

  const handleStop = () => {
    if (biteTimer.current) window.clearTimeout(biteTimer.current);
    navigateTo('home');
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>钓 鱼 台</span>
            <span className={styles.appbarZone}>(1, 3) · 月 色 正 好</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="鱼袋" onClick={() => navigateTo('inventory')}>袋</button>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={handleStop}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.fiPond}>
          <div className={styles.fiMoon} />
          <div className={styles.fiStatus}>饵 · 墨鱼骨 · 剩 {bait}</div>
          <div className={styles.fiChar}>{`丹 青\n垂 钓 姿`}</div>
          {biting && <div className={styles.fiBite}>⚠ 咬 钩 · 立 即 提 竿</div>}
        </div>

        <div className={styles.fiStats}>
          <div>
            <div className={styles.fiStatsL}>今 日</div>
            <div className={styles.fiStatsV}>{today}</div>
          </div>
          <div>
            <div className={styles.fiStatsL}>稀 有</div>
            <div className={`${styles.fiStatsV} ${styles.fiStatsVPurple}`}>{rare}</div>
          </div>
          <div>
            <div className={styles.fiStatsL}>最 大</div>
            <div className={`${styles.fiStatsV} ${styles.fiStatsVRed}`}>鲲</div>
          </div>
          <div>
            <div className={styles.fiStatsL}>上 限</div>
            <div className={`${styles.fiStatsV} ${styles.fiStatsVDim}`}>{today} / {limit}</div>
          </div>
        </div>

        <div className={styles.sectLine}>今 日 鱼 获 · {INITIAL_CATCH.length} 种</div>

        {INITIAL_CATCH.map((c) => (
          <div key={c.id} className={styles.fiPool}>
            <span className={styles.fiPoolIc}>{c.icon}</span>
            <div className={styles.fiPoolI}>
              <div
                className={`${styles.fiPoolNm} ${c.rarity === 'rare' ? styles.fiPoolNmRare : c.rarity === 'ur' ? styles.fiPoolNmUr : ''}`.trim()}
              >
                {c.name} {c.rarity === 'rare' ? '· 稀有' : c.rarity === 'ur' ? '· 传说' : ''}
              </div>
              <div className={styles.fiPoolSm}>{c.weight} · {c.count} 条 · {c.action}</div>
            </div>
            <span className={styles.fiPoolPr}>{c.value}</span>
          </div>
        ))}

        <div className={styles.sectLine}>钓 鱼 道 具</div>

        {TOOLS.map((t, i) => (
          <div key={i} className={styles.fiPool}>
            <span className={styles.fiPoolIc}>{t.icon}</span>
            <div className={styles.fiPoolI}>
              <div className={styles.fiPoolNm}>{t.name}</div>
              <div className={styles.fiPoolSm}>{t.desc}</div>
            </div>
            <span className={styles.fiPoolPr}>{t.status}</span>
          </div>
        ))}
      </div>

      <div className={styles.fiCta}>
        <button type="button" className={styles.fiCtaB} onClick={handleSwapBait}>换 饵</button>
        <button
          type="button"
          className={`${styles.fiCtaB} ${styles.fiCtaMain}`}
          onClick={handleHook}
          disabled={bait <= 0}
        >
          {bait <= 0 ? '无 饵' : biting ? '提 竿' : '等 待'}
        </button>
        <button type="button" className={styles.fiCtaB} onClick={handleStop}>收 竿</button>
      </div>
    </div>
  );
}
