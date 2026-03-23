import React from 'react';
import styles from './PageSkeleton.module.css';

/** P02 · 对战页 - 回合制战斗 */
export default function BattlePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>战斗</h2>
      </div>
      <div className={styles.canvasArea} id="phaser-battle">
        <div className={styles.placeholder}>
          <span className={styles.placeholderIcon}>⚔️</span>
          <p>回合制战斗区域</p>
          <p className={styles.hint}>战斗特效与动画将在此渲染</p>
        </div>
      </div>
    </div>
  );
}
