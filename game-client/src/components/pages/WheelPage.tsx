import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import {
  fetchWheelInfo,
  rollGacha,
  type GachaResult,
  type WheelPrize,
} from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const SLICES = 8;
const SLICE_DEG = 360 / SLICES;
const SPIN_MS = 3200;
const GACHA_ID = 'wheel';

interface LogEntry {
  time: string;
  reward: string;
}

function hhmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const QUALITY_ICON: Record<GachaResult['quality'], string> = {
  white: '宝',
  green: '玉',
  blue: '珠',
  purple: '神',
  orange: '圣',
};

const QUALITY_LABEL: Record<GachaResult['quality'], string> = {
  white: '凡品',
  green: '良品',
  blue: '稀世',
  purple: '至尊',
  orange: '神级',
};

function pickSliceIndex(prizes: WheelPrize[], result: GachaResult): number {
  const direct = prizes.findIndex((p) => p.id === result.itemId || p.name === result.itemName);
  if (direct >= 0 && direct < SLICES) return direct;
  let hash = 0;
  for (let i = 0; i < result.itemId.length; i++) {
    hash = (hash * 31 + result.itemId.charCodeAt(i)) | 0;
  }
  return ((hash % SLICES) + SLICES) % SLICES;
}

export default function WheelPage() {
  usePageBackground(PAGE_BG.WHEEL);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [prizes, setPrizes] = useState<WheelPrize[]>([]);
  const [freeSpins, setFreeSpins] = useState(0);
  const [spinCost, setSpinCost] = useState(100);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<GachaResult | null>(null);
  const totalRot = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await fetchWheelInfo();
      setPrizes(data.prizes || []);
      setFreeSpins(data.freeSpins ?? 0);
      setSpinCost(data.spinCost ?? 100);
      setLog(data.history || []);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doSpin = useCallback(
    async (isTen: boolean) => {
      if (spinning || prizes.length === 0) return;
      setSpinning(true);
      try {
        const results = await rollGacha(GACHA_ID, isTen ? 10 : 1);
        if (!results || results.length === 0) {
          toast.error('系统繁忙，请稍后再试');
          setSpinning(false);
          return;
        }

        const headline = results[0];
        const idx = pickSliceIndex(prizes, headline);
        const sliceMid = idx * SLICE_DEG + SLICE_DEG / 2;
        const cur = totalRot.current;
        const base = Math.ceil(cur / 360) * 360;
        const target = base + 360 * 4 + (360 - sliceMid);
        totalRot.current = target;
        setRotation(target);

        window.setTimeout(() => {
          setResult(headline);
          setFreeSpins((prev) => Math.max(0, prev - (isTen ? 10 : 1)));
          setLog((prev) => {
            const additions = results.map((r) => ({
              time: hhmm(),
              reward: `${QUALITY_LABEL[r.quality]} · ${r.itemName} ×${r.quantity}`,
            }));
            return [...additions, ...prev].slice(0, 12);
          });
          setSpinning(false);
          if (isTen) {
            const top = results.find((r) => r.quality === 'orange' || r.quality === 'purple');
            if (top) {
              toast.reward(`10 连保底命中 · ${QUALITY_LABEL[top.quality]} ${top.itemName}`);
            } else {
              toast.info(`10 连完成 · 共获 ${results.length} 件物品`);
            }
          } else {
            toast.success(`获得 ${headline.itemName} ×${headline.quantity}`);
          }
        }, SPIN_MS + 80);
      } catch {
        toast.error('系统繁忙，请稍后再试');
        setSpinning(false);
      }
    },
    [spinning, prizes],
  );

  const rendered = prizes.slice(0, SLICES);
  const hasFree = freeSpins > 0;

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>转 盘</span>
            <span className={styles.appbarZone}>气 运 所 往 · 转 轮 定 格</span>
          </div>
          <div className={styles.appbarIcons}>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => navigateTo('shop')}
              aria-label="商城"
            >商</button>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => navigateTo('activity')}
              aria-label="活动"
            >动</button>
          </div>
        </div>
      </div>

      <div className={styles.whHero}>
        <div className={styles.whHeroTitle}>幸 运 转 盘</div>
        <div className={styles.whHeroSub}>—— 气 运 所 往 · 转 轮 定 格 ——</div>
      </div>

      <div className={styles.whStage}>
        <div className={styles.whWheelBox}>
          <div className={styles.whPointer} />
          <div
            className={styles.whWheel}
            style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%' }}
          >
            {rendered.map((p, i) => {
              const rotate = i * SLICE_DEG + SLICE_DEG / 2;
              return (
                <div
                  key={p.id}
                  className={`${styles.whSlice}${p.rare ? ` ${styles.whSliceRare}` : ''}`}
                  style={{ transform: `rotate(${rotate}deg)` }}
                >
                  <div className={styles.whSliceInner}>
                    <span className={styles.whSliceIcon}>{p.icon}</span>
                    {p.name.length > 5 ? p.name.slice(0, 5) : p.name}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.whHub}
            onClick={() => doSpin(false)}
            disabled={spinning}
          >
            {spinning ? '转' : '抽'}
          </button>
        </div>

        <div className={styles.whMeta}>
          <span>
            消 耗 · <span className={styles.whMetaCost}>{spinCost}</span> 钻
          </span>
          {hasFree ? (
            <span className={styles.whMetaFree}>免 费 × {freeSpins}</span>
          ) : (
            <span>今 日 已 用 免 费 次 数</span>
          )}
        </div>

        <div className={styles.whPool}>
          <div className={styles.whSectH}>— 奖 池 公 示 —</div>
          <div className={styles.whPoolGrid}>
            {rendered.map((p) => (
              <div
                key={p.id}
                className={`${styles.whPoolItem}${p.rare ? ` ${styles.whPoolItemRare}` : ''}`}
              >
                <span className={styles.whPoolIcon}>{p.icon}</span>
                <span className={styles.whPoolName}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.whLog}>
          <div className={styles.whSectH}>— 战 报 ——</div>
          {log.length > 0 ? (
            log.map((h, i) => (
              <div key={`${h.time}-${i}`} className={styles.whLogRow}>
                <span className={styles.whLogTime}>{h.time}</span>
                <span className={styles.whLogReward}>{h.reward}</span>
              </div>
            ))
          ) : (
            <div className={styles.whLogEmpty}>尚 无 记 录 · 首 抽 即 是 头 彩</div>
          )}
        </div>
      </div>

      <div className={styles.whCta}>
        <button
          type="button"
          className={`${styles.whCtaBtn} ${styles.whCtaOnce}`}
          onClick={() => doSpin(false)}
          disabled={spinning}
        >
          抽 × 1
        </button>
        <button
          type="button"
          className={`${styles.whCtaBtn} ${styles.whCtaTen}`}
          onClick={() => doSpin(true)}
          disabled={spinning}
        >
          连 抽 × 10
        </button>
      </div>

      {result && (
        <div className={styles.whOverlay} onClick={() => setResult(null)}>
          <div className={styles.whCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.whCardTag}>★ 气 运 所 归 ★</div>
            <div className={styles.whCardIcon}>{QUALITY_ICON[result.quality]}</div>
            <div className={styles.whCardName}>{result.itemName}</div>
            <div className={styles.whCardDesc}>
              {QUALITY_LABEL[result.quality]} · 数量 ×{result.quantity}
            </div>
            <button
              type="button"
              className={styles.whCardBtn}
              onClick={() => setResult(null)}
            >
              收 下
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
