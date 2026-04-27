import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface Tier {
  amt: number;
  gifts: string;
  state: 'ready' | 'done' | 'lock';
}

// TODO: 接入 /milestone/state 与 /milestone/claim 接口
const STATE = {
  paid: 380,
  goal: 1000,
};

const TIERS: Tier[] = [
  { amt: 6, gifts: '紫 玄 散 ×3 · 命 格 卷 ×1 · 元 婴 丹 ×1', state: 'done' },
  { amt: 30, gifts: '玉 璧 ×120 · 八 卦 罗 盘 · 七 日 月 卡', state: 'done' },
  { amt: 98, gifts: '青 龙 法 衣 · 玉 璧 ×420 · 神 兵 凝 神 符', state: 'done' },
  { amt: 198, gifts: '玄 武 圣 鼎 · 玉 璧 ×880 · 双 修 加 成 + 7 日', state: 'ready' },
  { amt: 388, gifts: '朱 雀 神 翎 · 玉 璧 ×1,800 · 限 定 称 号', state: 'lock' },
  { amt: 648, gifts: '九 转 金 丹 ×3 · 玉 璧 ×3,200 · 限 定 时 装', state: 'lock' },
  { amt: 1888, gifts: '太 虚 法 宝 · 玉 璧 ×9,600 · 限 定 坐 骑', state: 'lock' },
];

export default function FirstRechargePage() {
  usePageBackground(PAGE_BG.FIRST_RECHARGE);
  const back = useGameStore((s) => s.back);
  const pct = Math.min(100, Math.round((STATE.paid / STATE.goal) * 100));

  const handleClaim = (t: Tier) => {
    if (t.state === 'lock') {
      toast.error('未 达 累 充 门 槛');
      return;
    }
    if (t.state === 'done') {
      toast.info('该 档 已 领 取');
      return;
    }
    toast.info(`已 领 取 ${t.amt} 档 礼 包`);
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>累 充 里 程 碑</span>
            <span className={styles.appbarZone}>七 阶 厚 礼 · 充 之 必 领</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => back()}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.frHero}>
          <div className={styles.frBadge}>限 时 七 日</div>
          <div className={styles.frT}>累 充 万 礼</div>
          <div className={styles.frS}>每 充 必 领 · 永 久 留 痕</div>
        </div>

        <div className={styles.frProg}>
          <div className={styles.frProgK}>累 计 已 充 值</div>
          <div className={styles.frProgBar}>
            <div className={styles.frProgFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.frProgV}>{STATE.paid} / {STATE.goal} 玉</div>
        </div>

        <div className={styles.sectLine}>礼 包 名 录</div>

        {TIERS.map((t, i) => {
          const btnCls =
            t.state === 'ready' ? styles.frTierBtnReady :
            t.state === 'done' ? styles.frTierBtnDone :
            styles.frTierBtnLock;
          const btnText = t.state === 'ready' ? '领 取' : t.state === 'done' ? '已 领' : '未 达';
          return (
            <div key={i} className={styles.frTier}>
              <div>
                <div className={styles.frTierAmt}>{t.amt}</div>
                <span className={styles.frTierAmtU}>玉 璧</span>
              </div>
              <div className={styles.frTierGifts}>{t.gifts}</div>
              <button
                type="button"
                className={`${styles.frTierBtn} ${btnCls}`}
                disabled={t.state === 'lock'}
                onClick={() => handleClaim(t)}
              >
                {btnText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
