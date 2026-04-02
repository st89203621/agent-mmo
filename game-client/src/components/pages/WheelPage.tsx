import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '../../store/toastStore';
import { fetchWheelInfo, spinWheel, type WheelPrize, type WheelSpinResult } from '../../services/api';
import page from '../../styles/page.module.css';
import own from './WheelPage.module.css';

const styles = { ...page, ...own };

const SEGMENT_COLORS = [
  'rgba(201,168,76,0.18)', 'rgba(120,80,40,0.15)',
  'rgba(201,168,76,0.10)', 'rgba(120,80,40,0.08)',
  'rgba(201,168,76,0.18)', 'rgba(120,80,40,0.15)',
  'rgba(201,168,76,0.10)', 'rgba(120,80,40,0.08)',
];

export default function WheelPage() {
  const [prizes, setPrizes] = useState<WheelPrize[]>([]);
  const [freeSpins, setFreeSpins] = useState(0);
  const [spinCost, setSpinCost] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelSpinResult | null>(null);
  const [history, setHistory] = useState<{ time: string; reward: string }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const totalRotation = useRef(0);

  const loadInfo = useCallback(async () => {
    try {
      const data = await fetchWheelInfo();
      setPrizes(data.prizes || []);
      setFreeSpins(data.freeSpins ?? 0);
      setSpinCost(data.spinCost ?? 100);
      setHistory(data.history || []);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { loadInfo(); }, [loadInfo]);

  // 绘制转盘
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 280;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;
    const count = prizes.length || 8;
    const arc = (2 * Math.PI) / count;

    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, i * arc - Math.PI / 2, (i + 1) * arc - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,168,76,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 文字和图标
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * arc + arc / 2 - Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c9a84c';
      ctx.font = '20px serif';
      ctx.fillText(prizes[i]?.icon || '🎁', 0, -r * 0.6);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = 'rgba(200,180,140,0.9)';
      const name = prizes[i]?.name || '';
      ctx.fillText(name.length > 4 ? name.slice(0, 4) + '..' : name, 0, -r * 0.38);
      ctx.restore();
    }
  }, [prizes]);

  const handleSpin = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await spinWheel();
      const prizeIndex = res.prizeIndex ?? 0;
      const count = prizes.length || 8;
      const arc = 360 / count;
      // 计算目标角度（指针在顶部，需要让目标奖品转到顶部）
      const targetAngle = 360 - prizeIndex * arc;
      const spins = 5 * 360; // 转5圈
      const newRotation = totalRotation.current + spins + targetAngle - (totalRotation.current % 360);
      totalRotation.current = newRotation;
      setRotation(newRotation);

      // 等动画结束
      setTimeout(() => {
        setResult(res);
        setFreeSpins(res.remainingFreeSpins ?? Math.max(0, freeSpins - 1));
        if (res.rewardName) {
          setHistory(prev => [
            { time: new Date().toLocaleTimeString(), reward: res.rewardName },
            ...prev.slice(0, 9),
          ]);
        }
        setSpinning(false);
      }, 4200);
    } catch (e: any) {
      toast.error(e.message || '转盘失败');
      setSpinning(false);
    }
  }, [spinning, prizes, freeSpins]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>天命之轮</h2>
        <p className={styles.subtitle}>转动命运齿轮，赢取稀世奖赏</p>
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.wheelWrap}>
          {/* 转盘 */}
          <div className={styles.wheelOuter}>
            <div className={styles.wheelPointer}>▼</div>
            <canvas
              ref={canvasRef}
              className={styles.wheelCanvas}
              style={{ transform: `rotate(${rotation}deg)` }}
              width={280}
              height={280}
            />
            <button
              className={styles.wheelCenter}
              onClick={handleSpin}
              disabled={spinning}
            >
              {spinning ? '...' : '转动'}
            </button>
          </div>

          {/* 免费次数 */}
          <div className={styles.freeRow}>
            {freeSpins > 0 ? (
              <span className={styles.freeBadge}>免费次数: {freeSpins}</span>
            ) : (
              <span className={styles.costBadge}>消耗 {spinCost} 钻石/次</span>
            )}
          </div>

          {/* 抽奖按钮 */}
          <button
            className={styles.spinBtn}
            disabled={spinning}
            onClick={handleSpin}
          >
            {spinning ? '命运转动中...' : freeSpins > 0 ? '免费转动' : `消耗 ${spinCost} 钻石转动`}
          </button>
        </div>

        {/* 奖品一览 */}
        {prizes.length > 0 && (
          <div className={styles.prizeSection}>
            <div className={styles.prizeTitle}>奖品一览</div>
            <div className={styles.prizeGrid}>
              {prizes.map((p, i) => (
                <div key={i} className={`${styles.prizeItem} ${p.rare ? styles.prizeRare : ''}`}>
                  <span className={styles.prizeIcon}>{p.icon}</span>
                  <span className={styles.prizeName}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 抽奖记录 */}
        {history.length > 0 && (
          <div className={styles.historySection}>
            <div className={styles.prizeTitle}>抽奖记录</div>
            {history.map((h, i) => (
              <div key={i} className={styles.historyItem}>
                <span className={styles.historyTime}>{h.time}</span>
                <span className={styles.historyReward}>{h.reward}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 结果弹窗 */}
      {result && (
        <div className={styles.resultOverlay} onClick={() => setResult(null)}>
          <div className={styles.resultCard} onClick={e => e.stopPropagation()}>
            <div className={styles.resultIcon}>{result.rewardIcon || '🎁'}</div>
            <div className={styles.resultName}>{result.rewardName || '神秘奖品'}</div>
            <div className={styles.resultDesc}>{result.rewardDesc || '恭喜获得奖品！'}</div>
            <button className={styles.resultBtn} onClick={() => setResult(null)}>收下</button>
          </div>
        </div>
      )}
    </div>
  );
}
