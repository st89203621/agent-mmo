import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import {
  fetchWheelInfo,
  spinWheel,
  type WheelPrize,
  type WheelSpinResult,
} from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const SLICES = 8;
const SLICE_DEG = 360 / SLICES;
const SPIN_MS = 3200;

interface LogEntry {
  time: string;
  reward: string;
}

function hhmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
  const [result, setResult] = useState<WheelSpinResult | null>(null);
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
        const res = await spinWheel();
        const idx = ((res.prizeIndex ?? 0) % SLICES + SLICES) % SLICES;
        const sliceMid = idx * SLICE_DEG + SLICE_DEG / 2;
        const cur = totalRot.current;
        const base = Math.ceil(cur / 360) * 360;
        const target = base + 360 * 4 + (360 - sliceMid);
        totalRot.current = target;
        setRotation(target);

        window.setTimeout(() => {
          setResult(res);
          setFreeSpins(res.remainingFreeSpins ?? Math.max(0, freeSpins - 1));
          if (res.rewardName) {
            setLog((prev) => [{ time: hhmm(), reward: res.rewardName }, ...prev].slice(0, 12));
          }
          setSpinning(false);
          if (isTen) toast.info('连抽首格公示 · 剩余 9 次自动结算');
        }, SPIN_MS + 80);
      } catch (e) {
        toast.error((e as Error).message || '转盘失败');
        setSpinning(false);
      }
    },
    [spinning, prizes, freeSpins],
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
            <div className={styles.whCardIcon}>{result.rewardIcon || '宝'}</div>
            <div className={styles.whCardName}>{result.rewardName || '神秘奖品'}</div>
            <div className={styles.whCardDesc}>{result.rewardDesc || '恭 喜 获 得 奖 品'}</div>
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
