import React, { useState } from 'react';
import styles from './PageSkeleton.module.css';

/** P15 · 图鉴收集页 */
export default function CodexPage() {
  const [tab, setTab] = useState<'npc' | 'scene' | 'equip'>('npc');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>图鉴</h2>
      </div>
      <div className={styles.tabRow}>
        <button className={`${styles.tab} ${tab === 'npc' ? styles.tabActive : ''}`}
                onClick={() => setTab('npc')}>角色</button>
        <button className={`${styles.tab} ${tab === 'scene' ? styles.tabActive : ''}`}
                onClick={() => setTab('scene')}>场景</button>
        <button className={`${styles.tab} ${tab === 'equip' ? styles.tabActive : ''}`}
                onClick={() => setTab('equip')}>装备</button>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.empty}>
          <span className={styles.placeholderIcon}>📕</span>
          <p>探索更多世界以解锁图鉴</p>
        </div>
      </div>
    </div>
  );
}
