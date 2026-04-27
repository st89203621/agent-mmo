import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';

interface GhostMark {
  id: number;
  x: number;
  y: number;
  hit: boolean;
}

const SPAWN_INTERVAL = 1100;
const TTL = 1800;
const MAX_GHOSTS = 6;

// TODO: 接入 /ghosthouse/start 与 /ghosthouse/score 接口
export default function GhostHousePage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [ghosts, setGhosts] = useState<GhostMark[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(60);
  const [running, setRunning] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setTime((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(tick);
  }, [running]);

  useEffect(() => {
    if (time === 0 && running) {
      setRunning(false);
      toast.info(`本 局 得 分 ${score}`);
    }
  }, [time, running, score]);

  useEffect(() => {
    if (!running) return;
    const sp = setInterval(() => {
      setGhosts((prev) => {
        if (prev.length >= MAX_GHOSTS) return prev;
        const id = ++idRef.current;
        const g: GhostMark = { id, x: 8 + Math.random() * 84, y: 14 + Math.random() * 70, hit: false };
        setTimeout(() => setGhosts((p) => p.filter((x) => x.id !== id)), TTL);
        return [...prev, g];
      });
    }, SPAWN_INTERVAL);
    return () => clearInterval(sp);
  }, [running]);

  const handleStart = () => {
    setScore(0);
    setCombo(0);
    setTime(60);
    setGhosts([]);
    setRunning(true);
  };

  const handleHit = (id: number) => {
    setGhosts((prev) => prev.map((g) => (g.id === id ? { ...g, hit: true } : g)));
    setScore((s) => s + 100 + combo * 20);
    setCombo((c) => c + 1);
    setTimeout(() => setGhosts((p) => p.filter((g) => g.id !== id)), 200);
  };

  const handleStop = () => {
    setRunning(false);
    setTime(0);
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>捉 鬼 屋</span>
            <span className={styles.appbarZone}>子 时 三 刻 · 群 鬼 出 没</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.ghStage}>
        <div className={styles.ghFog} />
        {ghosts.map((g) => (
          <span
            key={g.id}
            className={`${styles.ghGhost} ${g.hit ? styles.ghGhostHit : ''}`.trim()}
            style={{ left: `${g.x}%`, top: `${g.y}%` }}
            onClick={() => running && !g.hit && handleHit(g.id)}
          >
            鬼
          </span>
        ))}
      </div>

      <div className={styles.ghHud}>
        <div>
          <div className={styles.ghHudV}>{score}</div>
          <div className={styles.ghHudL}>得 分</div>
        </div>
        <div>
          <div className={styles.ghHudV}>×{combo}</div>
          <div className={styles.ghHudL}>连 击</div>
        </div>
        <div>
          <div className={styles.ghHudV}>{time}s</div>
          <div className={styles.ghHudL}>剩 余</div>
        </div>
      </div>

      <div className={styles.ghAct}>
        <button type="button" className={`${styles.ghBtn} ${styles.ghBtnPrim}`.trim()} onClick={handleStart} disabled={running}>
          {running ? '进 行 中' : '开 局'}
        </button>
        <button type="button" className={styles.ghBtn} onClick={handleStop} disabled={!running}>
          收 手
        </button>
      </div>
    </div>
  );
}
