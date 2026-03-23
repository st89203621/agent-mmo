import React from 'react';
import styles from './PageSkeleton.module.css';

/** P09 · 技能树页 - 情感系 + 战斗系 */
export default function SkillTreePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>技能树</h2>
        <p className={styles.subtitle}>七世轮回，逐步觉醒</p>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.tabRow}>
          <button className={`${styles.tab} ${styles.tabActive}`}>情感系</button>
          <button className={styles.tab}>战斗系</button>
        </div>
        <div className={styles.empty}>
          <span className={styles.placeholderIcon}>🌳</span>
          <p>技能通过轮回积累解锁</p>
        </div>
      </div>
    </div>
  );
}
