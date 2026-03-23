import React, { useState } from 'react';
import styles from './PageSkeleton.module.css';

/** P16 · 创角页 */
export default function CharCreatePage() {
  const [gender, setGender] = useState<'male' | 'female'>('female');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>创建角色</h2>
        <p className={styles.subtitle}>踏入轮回之前，先塑你今世之身</p>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.createPreview}>
          <div className={styles.avatarLarge}>
            {gender === 'female' ? '👩' : '👨'}
          </div>
        </div>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>性别</h3>
          <div className={styles.optionRow}>
            <button className={`${styles.optionBtn} ${gender === 'female' ? styles.optionActive : ''}`}
                    onClick={() => setGender('female')}>女</button>
            <button className={`${styles.optionBtn} ${gender === 'male' ? styles.optionActive : ''}`}
                    onClick={() => setGender('male')}>男</button>
          </div>
        </div>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>发型</h3>
          <div className={styles.optionRow}>
            {['长发', '短发', '束发', '披肩'].map((h) => (
              <button key={h} className={styles.optionBtn}>{h}</button>
            ))}
          </div>
        </div>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>服饰</h3>
          <div className={styles.optionRow}>
            {['素衣', '华裳', '铠甲', '道袍'].map((c) => (
              <button key={c} className={styles.optionBtn}>{c}</button>
            ))}
          </div>
        </div>
        <button className={styles.primaryBtn}>确认创建</button>
      </div>
    </div>
  );
}
