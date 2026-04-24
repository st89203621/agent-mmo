import { Fragment, useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { fetchRebirthStatus } from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';

interface RebirthData {
  currentWorldIndex: number;
  totalRebirths: number;
  currentBook: string;
  rebirthPoem: string;
}

const TOTAL_WORLDS = 7;

export default function RebirthPage() {
  const playerWorld = usePlayerStore((s) => s.playerWorld);
  const setCurrentWorld = usePlayerStore((s) => s.setCurrentWorld);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [data, setData] = useState<RebirthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRebirthStatus()
      .then((res) => {
        setData(res);
        setCurrentWorld(res.currentWorldIndex);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setCurrentWorld]);

  if (loading) {
    return (
      <div className={styles.mockPage}>
        <div className={styles.rbLoading}>轮回之轮正在转动 ...</div>
      </div>
    );
  }

  const currentIndex = data?.currentWorldIndex ?? 0;
  const worlds = playerWorld?.worlds ?? [];

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>轮 回</span>
            <span className={styles.appbarZone}>七 世 书 缘 · 因 果 循 环</span>
          </div>
          <div className={styles.appbarIcons}>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => navigateTo('home')}
              aria-label="返回"
            >
              回
            </button>
          </div>
        </div>
      </div>

      <div className={styles.rbHero}>
        <span className={styles.rbSymbol}>☯</span>
        <div className={styles.rbTitle}>七 世 轮 回</div>
        <div className={styles.rbSub}>—— 第 {currentIndex + 1} 世 ——</div>
      </div>

      {data?.rebirthPoem && <div className={styles.rbPoem}>{data.rebirthPoem}</div>}

      <div className={styles.rbBody}>
        <div className={styles.rbTimeline}>
          {Array.from({ length: TOTAL_WORLDS }).map((_, i) => {
            const world = worlds.find((w) => w.worldIndex === i);
            const isCurrent = i === currentIndex;
            const isCompleted = world?.status === 'COMPLETED';
            const prevDone = i > 0 && worlds[i - 1]?.status === 'COMPLETED';

            const dotCls = isCurrent
              ? styles.rbDotCur
              : isCompleted
                ? styles.rbDotDone
                : '';

            return (
              <Fragment key={i}>
                {i > 0 && (
                  <div
                    className={`${styles.rbConn} ${prevDone || isCompleted ? styles.rbConnDone : ''}`.trim()}
                  />
                )}
                <button
                  type="button"
                  className={styles.rbNode}
                  onClick={() => isCurrent && navigateTo('story')}
                  disabled={!isCurrent}
                >
                  <span className={`${styles.rbDot} ${dotCls}`.trim()}>
                    {isCompleted ? '✓' : i + 1}
                  </span>
                  <span
                    className={`${styles.rbNodeLabel} ${isCurrent ? styles.rbNodeLabelOn : ''}`.trim()}
                  >
                    {world?.bookTitle || (isCurrent ? '当 前' : '未 至')}
                  </span>
                </button>
              </Fragment>
            );
          })}
        </div>

        <div className={styles.rbInfo}>
          <span className={styles.rbBookName}>
            {data?.currentBook || '尚 未 选 择 书 籍 世 界'}
          </span>
          <span className={styles.rbWorldStatus}>
            {data?.currentBook ? '正 在 此 世 修 行' : '请 选 择 一 本 书 开 启 此 世'}
          </span>
          <div className={styles.rbStats}>
            <div className={styles.rbStat}>
              <span className={styles.rbStatNum}>{data?.totalRebirths ?? 0}</span>
              <span className={styles.rbStatLabel}>已 轮 回</span>
            </div>
            <div className={styles.rbStat}>
              <span className={styles.rbStatNum}>{currentIndex + 1}</span>
              <span className={styles.rbStatLabel}>当 前 世</span>
            </div>
            <div className={styles.rbStat}>
              <span className={styles.rbStatNum}>{TOTAL_WORLDS - currentIndex - 1}</span>
              <span className={styles.rbStatLabel}>剩 余 世</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.rbActs}>
        <button
          type="button"
          className={`${styles.rbBtn} ${styles.rbBtnSec}`}
          onClick={() => navigateTo('book-world')}
        >
          查 看 书 库
        </button>
        <button
          type="button"
          className={`${styles.rbBtn} ${styles.rbBtnPrim}`}
          onClick={() => navigateTo(data?.currentBook ? 'story' : 'book-world')}
        >
          {data?.currentBook ? '进 入 此 世' : '选 择 书 籍'}
        </button>
      </div>
    </div>
  );
}
