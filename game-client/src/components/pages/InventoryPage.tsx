import React, { useState } from 'react';
import styles from './PageSkeleton.module.css';

/** P10 · 背包仓库页 */
export default function InventoryPage() {
  const [tab, setTab] = useState<'bag' | 'storage'>('bag');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>背包</h2>
      </div>
      <div className={styles.tabRow}>
        <button className={`${styles.tab} ${tab === 'bag' ? styles.tabActive : ''}`}
                onClick={() => setTab('bag')}>背包</button>
        <button className={`${styles.tab} ${tab === 'storage' ? styles.tabActive : ''}`}
                onClick={() => setTab('storage')}>仓库</button>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.inventoryGrid}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className={styles.itemSlot} />
          ))}
        </div>
      </div>
    </div>
  );
}
