import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { fetchRebirthStatus } from '../../services/api';
import styles from './RebirthPage.module.css';

interface RebirthData {
  currentWorldIndex: number;
  totalRebirths: number;
  currentBook: string;
  rebirthPoem: string;
}

export default function RebirthPage() {
  const { playerWorld, setCurrentWorld } = usePlayerStore();
  const { navigateTo } = useGameStore();
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
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  const currentIndex = data?.currentWorldIndex ?? 0;
  const worlds = playerWorld?.worlds ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.symbolArea}>
        <span className={styles.symbol}>☯</span>
        <h2 className={styles.title}>七世轮回</h2>
        <p className={styles.subtitle}>第 {currentIndex + 1} 世</p>
      </div>

      {data?.rebirthPoem && (
        <p className={styles.poem}>{data.rebirthPoem}</p>
      )}

      {/* 七世时间轴 */}
      <div className={styles.timeline}>
        {Array.from({ length: 7 }).map((_, i) => {
          const world = worlds.find((w) => w.worldIndex === i);
          const isCurrent = i === currentIndex;
          const isCompleted = world?.status === 'COMPLETED';
          const isPending = !isCurrent && !isCompleted;

          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div className={`${styles.connector} ${isCompleted || (worlds[i - 1]?.status === 'COMPLETED') ? styles.connectorDone : ''}`} />
              )}
              <button className={styles.worldNode} onClick={() => isCurrent && navigateTo('story')}>
                <div className={`${styles.dot} ${isCurrent ? styles.dotCurrent : ''} ${isCompleted ? styles.dotCompleted : ''} ${isPending ? styles.dotPending : ''}`}>
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span className={`${styles.worldLabel} ${isCurrent ? styles.worldLabelActive : ''}`}>
                  {world?.bookTitle || (isCurrent ? '当前' : '未至')}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* 当前世信息 */}
      <div className={styles.currentInfo}>
        <span className={styles.bookName}>
          {data?.currentBook || '尚未选择书籍世界'}
        </span>
        <span className={styles.worldStatus}>
          {data?.currentBook ? '正在此世修行' : '请选择一本书开启此世'}
        </span>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{data?.totalRebirths ?? 0}</span>
            <span className={styles.statLabel}>已轮回</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{currentIndex + 1}</span>
            <span className={styles.statLabel}>当前世</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{7 - currentIndex - 1}</span>
            <span className={styles.statLabel}>剩余世</span>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className={styles.actions}>
        {data?.currentBook ? (
          <button className={styles.rebirthBtn} onClick={() => navigateTo('story')}>
            进入此世
          </button>
        ) : (
          <button className={styles.rebirthBtn} onClick={() => navigateTo('book-world')}>
            选择书籍世界
          </button>
        )}
        <button className={styles.selectBookBtn} onClick={() => navigateTo('book-world')}>
          查看书库
        </button>
      </div>
    </div>
  );
}
