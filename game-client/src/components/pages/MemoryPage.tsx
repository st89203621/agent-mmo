import React, { useEffect, useState, useCallback } from 'react';
import { fetchMemories } from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';
import type { MemoryFragment } from '../../types';
import styles from './PageSkeleton.module.css';

const EMOTION_COLORS: Record<string, string> = {
  calm: '#8b9dc3', happy: '#f0c040', sad: '#7a8fb5', angry: '#c44e52',
  shy: '#e8b4c8', surprised: '#e8a040', tender: '#c8a0d0', cold: '#88a8c8',
  fearful: '#8888a8', determined: '#d48040', melancholy: '#9090b0', playful: '#e8c070',
};

/** P04 · 记忆碎片页 */
export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryFragment[]>([]);
  const [selected, setSelected] = useState<MemoryFragment | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const { currentWorldIndex } = usePlayerStore();

  useEffect(() => {
    fetchMemories()
      .then((res) => setMemories(res.memories))
      .catch(() => {});
  }, []);

  const filtered = memories.filter(m => {
    if (filter === 'unlocked') return !m.locked;
    if (filter === 'locked') return m.locked;
    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>记忆长廊</h2>
        <p className={styles.subtitle}>前世今生，缘起缘灭 · 共 {memories.length} 段记忆</p>
      </div>

      {/* 筛选 */}
      <div className={styles.tabRow}>
        {(['all', 'unlocked', 'locked'] as const).map(f => (
          <button
            key={f}
            className={`${styles.tab} ${filter === f ? styles.tabActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部' : f === 'unlocked' ? '已解锁' : '未解锁'}
          </button>
        ))}
      </div>

      <div className={styles.scrollArea}>
        {/* 详情弹窗 */}
        {selected && !selected.locked && (
          <div
            className={styles.card}
            style={{
              marginBottom: 16,
              borderLeft: `3px solid ${EMOTION_COLORS[selected.emotionTone] || '#888'}`,
              cursor: 'pointer',
            }}
            onClick={() => setSelected(null)}
          >
            <div className={styles.cardTitle}>{selected.title}</div>
            <div className={styles.cardMeta}>
              {selected.npcName} · 第{selected.worldIndex + 1}世
              {selected.fateScore > 0 && <span style={{ color: '#e8b4c8', marginLeft: 8 }}>缘分 {selected.fateScore}</span>}
            </div>
            <p className={styles.cardDesc} style={{ whiteSpace: 'pre-wrap' }}>{selected.excerpt}</p>
            <p className={styles.hint} style={{ marginTop: 8 }}>点击收起</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>🌙</span>
            <p>尚无记忆碎片</p>
            <p className={styles.hint}>与角色深入交流或探索书中世界后，记忆将在此浮现</p>
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {filtered.map((m) => (
              <div
                key={m.id}
                className={`${styles.card} ${m.locked ? styles.cardLocked : ''}`}
                style={{
                  cursor: m.locked ? 'default' : 'pointer',
                  borderLeft: `3px solid ${m.locked ? '#444' : EMOTION_COLORS[m.emotionTone] || '#888'}`,
                }}
                onClick={() => { if (!m.locked) setSelected(selected?.id === m.id ? null : m); }}
              >
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
