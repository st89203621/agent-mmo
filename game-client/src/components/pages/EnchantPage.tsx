import React from 'react';
import styles from './PageSkeleton.module.css';

/** P08 · 装备附魔页 - 多世界材料组合 */
export default function EnchantPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>附魔</h2>
        <p className={styles.subtitle}>集七世之力，铸不世之器</p>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.empty}>
          <span className={styles.placeholderIcon}>✨</span>
          <p>将不同世界的材料组合</p>
          <p className={styles.hint}>材料的世界元素决定附魔词条方向</p>
        </div>
      </div>
    </div>
  );
}
