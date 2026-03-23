import React, { useEffect, useState } from 'react';
import { fetchMemories } from '../../services/api';
import type { MemoryFragment } from '../../types';
import styles from './PageSkeleton.module.css';

/** P04 · 记忆碎片页 */
export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryFragment[]>([]);

  useEffect(() => {
    fetchMemories()
      .then((res) => setMemories(res.memories))
      .catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>记忆长廊</h2>
        <p className={styles.subtitle}>前世今生，缘起缘灭</p>
      </div>
      <div className={styles.scrollArea}>
        {memories.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>🌙</span>
            <p>尚无记忆碎片</p>
            <p className={styles.hint}>与角色深入交流后，记忆将在此浮现</p>
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {memories.map((m) => (
              <div key={m.id} className={`${styles.card} ${m.locked ? styles.cardLocked : ''}`}>
                <div className={styles.cardTitle}>{m.locked ? '???' : m.title}</div>
                <div className={styles.cardMeta}>{m.npcName} · 第{m.worldIndex + 1}世</div>
                {!m.locked && <p className={styles.cardDesc}>{m.excerpt}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
