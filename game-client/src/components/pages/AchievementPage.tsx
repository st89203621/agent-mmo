import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { fetchRelations } from '../../services/api';
import FateBar from '../common/FateBar';
import styles from './PageSkeleton.module.css';

/** P17 · 缘分榜·成就页 */
export default function AchievementPage() {
  const [tab, setTab] = useState<'fate' | 'achievement'>('fate');
  const { relations, setRelations } = usePlayerStore();

  useEffect(() => {
    if (relations.length === 0) {
      fetchRelations()
        .then((res) => setRelations(res.relations))
        .catch(() => {});
    }
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>缘分 · 成就</h2>
      </div>
      <div className={styles.tabRow}>
        <button className={`${styles.tab} ${tab === 'fate' ? styles.tabActive : ''}`}
                onClick={() => setTab('fate')}>缘分谱</button>
        <button className={`${styles.tab} ${tab === 'achievement' ? styles.tabActive : ''}`}
                onClick={() => setTab('achievement')}>成就</button>
      </div>
      <div className={styles.scrollArea}>
        {tab === 'fate' ? (
          relations.length > 0 ? (
            <div className={styles.cardList}>
              {relations.map((r, i) => (
                <div key={r.relationId || i} className={styles.card}>
                  <div className={styles.cardTitle}>{r.npcName}</div>
                  <FateBar fateScore={r.fateScore} trustScore={r.trustScore} npcName={r.npcName} />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.placeholderIcon}>💫</span>
              <p>尚无缘分记录</p>
            </div>
          )
        ) : (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>🏆</span>
            <p>成就系统即将开放</p>
          </div>
        )}
      </div>
    </div>
  );
}
