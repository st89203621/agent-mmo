import React from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './PageSkeleton.module.css';

/** P11 · 宠物管理页 */
export default function PetPage() {
  const { navigateTo } = useGameStore();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>宠物</h2>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.empty}>
          <span className={styles.placeholderIcon}>🐾</span>
          <p>尚未拥有宠物</p>
          <p className={styles.hint}>使用宠物蛋在召唤页孵化</p>
          <button className={styles.actionBtn} onClick={() => navigateTo('pet-summon')}>
            前往召唤
          </button>
        </div>
      </div>
    </div>
  );
}
