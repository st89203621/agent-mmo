import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface Target {
  id: number;
  x: number;
  y: number;
  hit: boolean;
}

const SPAWN_INTERVAL = 900;
const TTL = 1500;

// TODO: 接入 /shooting/start 与 /shooting/score 接口
export default function ShootingPage() {
  usePageBackground(PAGE_BG.SHOOTING);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [targets, setTargets] = useState<Target[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [bullets, setBullets] = useState(20);
  const [round, setRound] = useState(1);
  const [running, setRunning] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const sp = setInterval(() => {
      setTargets((prev) => {
        if (prev.length >= 3) return prev;
        const id = ++idRef.current;
        const t: Target = { id, x: 10 + Math.random() * 78, y: 14 + Math.random() * 70, hit: false };
        setTimeout(() => {
          setTargets((p) => {
            const exist = p.find((x) => x.id === id);
            if (exist && !exist.hit) {
              setMisses((m) => m + 1);
            }
            return p.filter((x) => x.id !== id);
          });
        }, TTL);
        return [...prev, t];
      });
    }, SPAWN_INTERVAL);
    return () => clearInterval(sp);
  }, [running]);

  useEffect(() => {
    if (running && bullets === 0) {
      setRunning(false);
      toast.info(`本 轮 命 中 ${hits} · 失 准 ${misses}`);
    }
  }, [bullets, running, hits, misses]);

  const handleStart = () => {
    setHits(0);
    setMisses(0);
    setBullets(20);
    setRound((r) => r + 1);
    setTargets([]);
    setRunning(true);
  };

  const handleHit = (id: number) => {
    if (bullets === 0) return;
    setBullets((b) => b - 1);
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, hit: true } : t)));
    setHits((h) => h + 1);
    setTimeout(() => setTargets((p) => p.filter((t) => t.id !== id)), 200);
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>射 击 场</span>
            <span className={styles.appbarZone}>百 步 穿 杨 · 一 弦 见 真</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.shStage}>
        <div className={styles.shCross} />
        {targets.map((t) => (
          <span
            key={t.id}
            className={`${styles.shTarget} ${t.hit ? styles.shTargetHit : ''}`.trim()}
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
            onClick={() => running && !t.hit && handleHit(t.id)}
          >
            ⊙
          </span>
        ))}
      </div>

      <div className={styles.shHud}>
        <div>
          <div className={styles.shHudV}>{round}</div>
          <div className={styles.shHudL}>轮 次</div>
        </div>
        <div>
          <div className={styles.shHudV}>{hits}</div>
          <div className={styles.shHudL}>命 中</div>
        </div>
        <div>
          <div className={styles.shHudV}>{misses}</div>
          <div className={styles.shHudL}>失 准</div>
        </div>
        <div>
          <div className={styles.shHudV}>{bullets}</div>
          <div className={styles.shHudL}>余 矢</div>
        </div>
      </div>

      <div className={styles.shAct}>
        <button type="button" className={styles.shBtn} onClick={handleStart} disabled={running}>
          {running ? '射 击 中 ...' : '开 弦'}
        </button>
      </div>
    </div>
  );
}
