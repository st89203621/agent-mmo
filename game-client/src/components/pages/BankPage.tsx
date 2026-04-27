import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { fetchPlayerCurrency } from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface FlowRow {
  type: 'in' | 'out' | 'swap';
  title: string;
  date: string;
  delta: string;
  tone: 'jade' | 'red' | 'gold';
}

// TODO: 接入 /bank/flow 接口
const MOCK_FLOWS: FlowRow[] = [
  { type: 'in', title: '拍 卖 成 交 · 宝 石 出 售', date: '04-23 14:38 · ⑤ 级 攻 击 石', delta: '+ 18,000', tone: 'jade' },
  { type: 'out', title: '神 匠 修 复 · 镇 天 刃', date: '04-23 09:12 · 8 处 磨 损', delta: '- 3,200', tone: 'red' },
  { type: 'in', title: '利 息 结 算 · 银 行', date: '04-22 00:00 · 日 息 0.3%', delta: '+ 117', tone: 'jade' },
  { type: 'swap', title: '玩 币 → 游 戏 币 · 兑 换', date: '04-22 12:01 · 50 玩 币', delta: '+ 5,550', tone: 'gold' },
];

const OPS: { key: string; label: string; icon: string; danger?: boolean }[] = [
  { key: 'deposit', label: '存 款', icon: '存' },
  { key: 'withdraw', label: '取 款', icon: '取' },
  { key: 'swap', label: '玩 → 游', icon: '兑', danger: true },
  { key: 'interest', label: '领 利 息', icon: '息' },
  { key: 'transfer', label: '转 账', icon: '给' },
  { key: 'flow', label: '流 水', icon: '史' },
  { key: 'lock', label: '保 险', icon: '码' },
  { key: 'loan', label: '借 贷', icon: '贷', danger: true },
];

export default function BankPage() {
  usePageBackground(PAGE_BG.BANK);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const gold = usePlayerStore((s) => s.gold);
  const diamond = usePlayerStore((s) => s.diamond);
  const setCurrency = usePlayerStore((s) => s.setCurrency);
  const [vault, setVault] = useState(0);

  useEffect(() => {
    fetchPlayerCurrency()
      .then((c) => {
        setCurrency(c.gold, c.diamond);
        // TODO: 后端补 vault 字段
        setVault(Math.max(0, c.gold * 3));
      })
      .catch(() => {});
  }, [setCurrency]);

  const dailyInterest = Math.floor(vault * 0.003);

  const handleOp = (key: string) => {
    if (key === 'flow') return;
    toast.info('该功能尚在筹备');
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>皇 家 钱 庄</span>
            <span className={styles.appbarZone}>存 · 取 · 兑 · 利 息</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.bkHero}>
          <div className={styles.bkHeroL}>— 银 行 余 额 —</div>
          <div className={styles.bkHeroV}>
            {vault.toLocaleString()}
            <span className={styles.bkHeroVU}>游 戏 币</span>
          </div>
          <div className={styles.bkHeroR}>日 息 0.3% · 明 日 进 账 + {dailyInterest.toLocaleString()}</div>
        </div>

        <div className={styles.bk3col}>
          <div>
            <div className={`${styles.bkV}`}>{diamond}</div>
            <div className={styles.bkL}>玩 币</div>
          </div>
          <div>
            <div className={`${styles.bkV} ${styles.bkVJade}`}>{gold.toLocaleString()}</div>
            <div className={styles.bkL}>游 戏 币 · 身</div>
          </div>
          <div>
            <div className={`${styles.bkV} ${styles.bkVRed}`}>0</div>
            <div className={styles.bkL}>威 望</div>
          </div>
        </div>

        <div className={styles.sectLine}>常 用 操 作</div>

        <div className={styles.bkOps}>
          {OPS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${styles.bkOp} ${o.danger ? styles.bkOpRed : ''}`.trim()}
              onClick={() => handleOp(o.key)}
            >
              <span className={styles.bkOpI}>{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>

        <div className={styles.sectLine}>近 7 日 流 水</div>

        {MOCK_FLOWS.map((f, i) => {
          const avCls = f.tone === 'jade' ? styles.bkRowAvJade : f.tone === 'red' ? styles.bkRowAvRed : styles.bkRowAvGold;
          const vCls = f.tone === 'jade' ? styles.bkRowVJade : f.tone === 'red' ? styles.bkRowVRed : styles.bkRowVGold;
          const sym = f.type === 'in' ? '+' : f.type === 'out' ? '-' : '↔';
          return (
            <div key={i} className={styles.bkRow}>
              <span className={`${styles.bkRowAv} ${avCls}`}>{sym}</span>
              <div className={styles.bkRowI}>
                <div className={styles.bkRowT1}>{f.title}</div>
                <div className={styles.bkRowT2}>{f.date}</div>
              </div>
              <span className={`${styles.bkRowV} ${vCls}`}>{f.delta}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
