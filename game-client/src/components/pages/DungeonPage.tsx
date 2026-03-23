import React from 'react';
import styles from './PageSkeleton.module.css';

/** P14 · 副本选择页 */
export default function DungeonPage() {
  const DUNGEON_TYPES = [
    { type: 'elite', label: '精英副本', icon: '👑', desc: '高难度，稀有掉落' },
    { type: 'normal', label: '普通副本', icon: '⚔️', desc: '日常挑战，稳定收益' },
    { type: 'timed', label: '限时副本', icon: '⏳', desc: '限时开放，特殊奖励' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>副本</h2>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.cardList}>
          {DUNGEON_TYPES.map((d) => (
            <button key={d.type} className={styles.card}>
              <span className={styles.placeholderIcon}>{d.icon}</span>
              <div className={styles.cardTitle}>{d.label}</div>
              <div className={styles.cardDesc}>{d.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
