import React, { useEffect, useState, useCallback } from 'react';
import { fetchMemories, fetchMemoryHall, unlockMemory } from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import type { MemoryFragment, MemoryHall } from '../../types';
import { EMOTION_LABELS, EMOTION_COLORS } from '../../constants/emotion';
import page from '../../styles/page.module.css';
import own from './MemoryPage.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const styles = { ...page, ...own };

function formatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** P04 · 记忆碎片页 */
export default function MemoryPage() {
  usePageBackground(PAGE_BG.MEMORY);
  const [memories, setMemories] = useState<MemoryFragment[]>([]);
  const [hall, setHall] = useState<MemoryHall | null>(null);
  const [selected, setSelected] = useState<MemoryFragment | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [worldFilter, setWorldFilter] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const loadData = useCallback(() => {
    const worldParam = worldFilter ?? undefined;
    fetchMemories(worldParam)
      .then((res) => setMemories(res.memories || []))
      .catch(() => {});
    fetchMemoryHall()
      .then((res) => setHall(res))
      .catch(() => {});
  }, [worldFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // 提取所有出现的世界索引
  const worldIndices = Array.from(new Set(memories.map(m => m.worldIndex))).sort();

  const filtered = memories.filter(m => {
    if (filter === 'unlocked') return !m.locked;
    if (filter === 'locked') return m.locked;
    return true;
  });

  // 按创建时间排序，新的在前
  const sorted = [...filtered].sort((a, b) => (b.createTime || 0) - (a.createTime || 0));

  const handleUnlock = useCallback(async (fragment: MemoryFragment) => {
    setUnlocking(fragment.id);
    try {
      const updated = await unlockMemory(fragment.id);
      setMemories(prev => prev.map(m => m.id === fragment.id ? { ...m, ...updated, locked: false } : m));
      setSelected(prev => prev?.id === fragment.id ? { ...prev, ...updated, locked: false } : prev);
      toast.reward('记忆碎片已解锁');
      // 刷新记忆馆数据
      fetchMemoryHall().then(setHall).catch(() => {});
    } catch (e: any) {
      toast.error(e.message || '解锁失败');
    }
    setUnlocking(null);
  }, []);

  return (
    <div className={styles.page}>
      {/* 头部 + 记忆馆统计 */}
      <div className={styles.header}>
        <h2 className={styles.title}>记忆长廊</h2>
        <p className={styles.subtitle}>前世今生，缘起缘灭</p>
        {hall && (
          <div className={styles.hallStats}>
            <span className={styles.statItem}>
              <span className={styles.statNum}>{hall.totalFragments}</span>
              <span className={styles.statLabel}>总记忆</span>
            </span>
            <span className={styles.statDivider} />
            <span className={styles.statItem}>
              <span className={styles.statNum}>{hall.unlockedFragments}</span>
              <span className={styles.statLabel}>已解锁</span>
            </span>
            <span className={styles.statDivider} />
            <span className={styles.statItem}>
              <span className={styles.statNum}>{Object.keys(hall.worldStats || {}).length}</span>
              <span className={styles.statLabel}>跨世</span>
            </span>
          </div>
        )}
      </div>

      {/* 状态筛选 */}
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

      {/* 世界筛选 */}
      {worldIndices.length > 1 && (
        <div className={styles.worldRow}>
          <button
            className={`${styles.worldBtn} ${worldFilter === null ? styles.worldActive : ''}`}
            onClick={() => setWorldFilter(null)}
          >
            全部世界
          </button>
          {worldIndices.map(wi => (
            <button
              key={wi}
              className={`${styles.worldBtn} ${worldFilter === wi ? styles.worldActive : ''}`}
              onClick={() => setWorldFilter(wi)}
            >
              第{wi + 1}世
            </button>
          ))}
        </div>
      )}

      <div className={styles.scrollArea}>
        {/* 详情展开 */}
        {selected && (
          <div
            className={styles.detailPanel}
            style={{ borderLeftColor: selected.locked ? '#444' : (EMOTION_COLORS[selected.emotionTone] || '#888') }}
          >
            <button className={styles.detailClose} onClick={() => setSelected(null)}>收起</button>
            <div className={styles.detailTitle}>{selected.locked ? '???' : selected.title}</div>
            <div className={styles.detailMeta}>
              <span>{selected.npcName}</span>
              <span className={styles.detailDot} />
              <span>第{selected.worldIndex + 1}世</span>
              {selected.bookTitle && (
                <>
                  <span className={styles.detailDot} />
                  <span>{selected.bookTitle}</span>
                </>
              )}
            </div>

            {!selected.locked ? (
              <>
                <p className={styles.detailExcerpt}>{selected.excerpt}</p>
                <div className={styles.detailFooter}>
                  {selected.fateScore > 0 && (
                    <span className={styles.fateBadge}>缘分 {selected.fateScore}</span>
                  )}
                  {selected.emotionTone && (
                    <span
                      className={styles.emotionTag}
                      style={{ background: EMOTION_COLORS[selected.emotionTone] || '#888' }}
                    >
                      {EMOTION_LABELS[selected.emotionTone] || selected.emotionTone}
                    </span>
                  )}
                  {selected.affectsNextWorld && (
                    <span className={styles.affectsBadge}>影响来世</span>
                  )}
                  {selected.createTime > 0 && (
                    <span className={styles.detailTime}>{formatTime(selected.createTime)}</span>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.lockedInfo}>
                <p className={styles.lockedHint}>{selected.unlockCondition || '缘分达到40解锁'}</p>
                <button
                  className={styles.unlockBtn}
                  disabled={unlocking === selected.id}
                  onClick={() => handleUnlock(selected)}
                >
                  {unlocking === selected.id ? '解锁中...' : '尝试解锁'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 列表 */}
        {sorted.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>&#127769;</span>
            <p>尚无记忆碎片</p>
            <p className={styles.emptyHint}>与角色深入交流或探索书中世界后，记忆将在此浮现</p>
          </div>
        ) : (
          <div className={styles.memoryList}>
            {sorted.map((m) => (
              <button
                key={m.id}
                className={`${styles.memoryCard} ${m.locked ? styles.memoryLocked : ''} ${selected?.id === m.id ? styles.memorySelected : ''}`}
                style={{ borderLeftColor: m.locked ? '#444' : (EMOTION_COLORS[m.emotionTone] || '#888') }}
                onClick={() => setSelected(selected?.id === m.id ? null : m)}
              >
                <div className={styles.memoryHeader}>
                  <span className={styles.memoryTitle}>{m.locked ? '???' : m.title}</span>
                  {m.affectsNextWorld && !m.locked && <span className={styles.affectsDot} title="影响来世" />}
                </div>
                <div className={styles.memoryMeta}>
                  <span>{m.npcName}</span>
                  <span className={styles.metaDot} />
                  <span>第{m.worldIndex + 1}世</span>
                  {m.bookTitle && !m.locked && (
                    <>
                      <span className={styles.metaDot} />
                      <span>{m.bookTitle}</span>
                    </>
                  )}
                </div>
                {!m.locked && m.excerpt && (
                  <p className={styles.memoryExcerpt}>{m.excerpt}</p>
                )}
                {!m.locked && m.fateScore > 0 && (
                  <div className={styles.memoryFate}>
                    <div className={styles.fateBar}>
                      <div
                        className={styles.fateBarFill}
                        style={{
                          width: `${m.fateScore}%`,
                          background: EMOTION_COLORS[m.emotionTone] || '#888',
                        }}
                      />
                    </div>
                    <span className={styles.fateNum}>{m.fateScore}</span>
                  </div>
                )}
                {m.locked && (
                  <div className={styles.lockHint}>{m.unlockCondition || '缘分达到40解锁'}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
