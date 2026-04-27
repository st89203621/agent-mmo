import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface TopupItem {
  id: string;
  price: number;
  coin: number;
  bonus?: number;
  gifts: string[];
  tag?: string;
  tagTone?: 'red' | 'gold';
  highlight?: 'hot' | 'best';
}

interface Pack {
  icon: string;
  title: string;
  sub: string;
  cta: string;
  done?: boolean;
}

// TODO: 接入 /shop/topup 接口（依赖支付）
const ITEMS: TopupItem[] = [
  { id: 't6', price: 6, coin: 666, bonus: 666, gifts: ['代练卡 ×1', '扩容卡 ×1'], tag: '首充 2×', tagTone: 'red' },
  { id: 't18', price: 18, coin: 2000, gifts: ['快进卡 ×5', '小红药 ×20'] },
  { id: 't36', price: 36, coin: 4000, bonus: 400, gifts: ['打怪上限翻倍', '免验证码 · 隐身卡'], tag: 'VIP1 解锁', tagTone: 'gold', highlight: 'hot' },
  { id: 't68', price: 68, coin: 7500, bonus: 800, gifts: ['双倍经验卡 ×3', '附魂丹 ×5'] },
  { id: 't328', price: 328, coin: 38000, bonus: 6000, gifts: ['钻石VIP 月卡', '天命丹 ×2', '砸蛋 ×10'], tag: '性价比', tagTone: 'gold', highlight: 'best' },
  { id: 't648', price: 648, coin: 78000, bonus: 18000, gifts: ['135 神宠券 ×1', '橙装礼包'] },
];

const PACKS: Pack[] = [
  { icon: '周', title: '每周累充 · 1000 玩币', sub: '奖励 代练卡 ×2 · 魔符 ×1 · 剩 3 天', cta: '领 取' },
  { icon: '新', title: '新区冲榜 · TOP100 消费榜', sub: '当前排名 # 7 · 奖励 百级神材', cta: '详 情' },
  { icon: '签', title: '月卡签到 · 每日玩币袋', sub: '黄金 VIP · 剩 22 天', cta: '已 签', done: true },
];

export default function RechargePage() {
  usePageBackground(PAGE_BG.RECHARGE);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const diamond = usePlayerStore((s) => s.diamond);

  const handleBuy = (item: TopupItem) => {
    toast.info(`选定 ¥ ${item.price} · 等待支付通道接入`);
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>充 值 中 心</span>
            <span className={styles.appbarZone}>气 盖 山 河 区</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="历史" onClick={() => toast.info('充值历史尚未接入')}>史</button>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.tuHero}>
          <div className={styles.tuT}>充 值 · 得 玩 币</div>
          <div className={styles.tuBank}>
            当 前 玩 币 <span className={styles.tuBankV}>{diamond}</span>
          </div>
          <div className={styles.tuCycle}>· 4 日周期 · 档位 3 天后重置 ·</div>
        </div>

        <div className={styles.tuGrid}>
          {ITEMS.map((it) => {
            const cls = it.highlight === 'hot' ? styles.tuItemHot : it.highlight === 'best' ? styles.tuItemBest : '';
            return (
              <button
                key={it.id}
                type="button"
                className={`${styles.tuItem} ${cls}`.trim()}
                onClick={() => handleBuy(it)}
              >
                {it.tag && (
                  <span className={`${styles.tuTagCorner} ${it.tagTone === 'gold' ? styles.tuTagCornerGold : ''}`.trim()}>
                    {it.tag}
                  </span>
                )}
                <div className={styles.tuPrice}>¥ {it.price}</div>
                <div className={styles.tuCoin}>
                  {it.coin.toLocaleString()} 玩 币
                  {it.bonus ? <span className={styles.tuCoinPlus}>+ {it.bonus.toLocaleString()}</span> : null}
                </div>
                <div className={styles.tuGift}>
                  {it.gifts.map((g, i) => (
                    <div key={i}>· {g}</div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className={styles.sectLine}>限 时 礼 包</div>

        {PACKS.map((p, i) => (
          <div key={i} className={styles.tuPack}>
            <span className={styles.tuPackIc}>{p.icon}</span>
            <div className={styles.tuPackI}>
              <div className={styles.tuPackT}>{p.title}</div>
              <div className={styles.tuPackS}>{p.sub}</div>
            </div>
            <button
              type="button"
              className={styles.tuPackClaim}
              disabled={p.done}
              onClick={() => toast.info(`${p.title} · ${p.cta}`)}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
