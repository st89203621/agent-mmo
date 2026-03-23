import React from 'react';
import styles from './PageSkeleton.module.css';

/** P12 · 宠物召唤页 */
export default function PetSummonPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>宠物召唤</h2>
        <p className={styles.subtitle}>以灵力凝聚，唤醒沉睡之魂</p>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.summonCircle}>
          <div className={styles.summonRing}>
            <span className={styles.placeholderIcon}>🥚</span>
          </div>
          <p className={styles.hint}>将宠物蛋放入召唤阵</p>
        </div>
      </div>
    </div>
  );
}
