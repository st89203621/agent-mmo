import React, { useEffect, useState, useCallback } from 'react';
import { fetchDungeons, enterDungeon, completeDungeonStage, exitDungeon, type DungeonData } from '../../services/api';
import styles from './PageSkeleton.module.css';

const TYPE_META: Record<string, { icon: string; label: string }> = {
  STORY: { icon: '📖', label: '剧情' },
  CHALLENGE: { icon: '⚔️', label: '挑战' },
  RAID: { icon: '👑', label: '团队' },
  ENDLESS: { icon: '♾️', label: '无尽' },
  BOSS: { icon: '🐉', label: 'BOSS' },
  PUZZLE: { icon: '🧩', label: '解谜' },
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已通关',
  FAILED: '失败',
};

export default function DungeonPage() {
  const [dungeons, setDungeons] = useState<DungeonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState<string | null>(null);
  const [selected, setSelected] = useState<DungeonData | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    fetchDungeons()
      .then(res => setDungeons(res.dungeons || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEnter = useCallback(async (dungeonId: string) => {
    setOperating(dungeonId);
    try {
      const res = await enterDungeon(dungeonId);
      setSelected(res.dungeon);
      loadData();
    } catch { /* noop */ }
    setOperating(null);
  }, [loadData]);

  const handleCompleteStage = useCallback(async () => {
    if (!selected) return;
    setOperating(selected.dungeonId);
    try {
      const res = await completeDungeonStage(selected.dungeonId, selected.currentStage + 1);
      setSelected(res.dungeon);
      loadData();
    } catch { /* noop */ }
    setOperating(null);
  }, [selected, loadData]);

  const handleExit = useCallback(async () => {
    if (!selected) return;
    setOperating(selected.dungeonId);
    try {
      await exitDungeon(selected.dungeonId);
      setSelected(null);
      loadData();
    } catch { /* noop */ }
    setOperating(null);
  }, [selected, loadData]);

  const activeDungeon = selected?.status === 'IN_PROGRESS' ? selected : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>副本</h2>
        <p className={styles.subtitle}>{dungeons.length} 个副本</p>
      </div>

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : activeDungeon ? (
          /* 副本进行中界面 */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '12px' }}>
              {TYPE_META[activeDungeon.type]?.icon || '⚔️'}
            </p>
            <h3 style={{ fontSize: '20px', color: 'var(--gold)', fontFamily: 'var(--font-main)', marginBottom: '8px' }}>
              {activeDungeon.dungeonName}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.6, marginBottom: '16px' }}>
              难度 {activeDungeon.difficulty} · 关卡 {activeDungeon.currentStage}/{activeDungeon.maxStage}
            </p>

            {/* 进度条 */}
            <div style={{ margin: '0 20px 20px', height: '8px', background: 'var(--paper-darker)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${activeDungeon.maxStage > 0 ? Math.round((activeDungeon.currentStage / activeDungeon.maxStage) * 100) : 0}%`,
                background: 'var(--gold)', borderRadius: '4px', transition: 'width 0.4s',
              }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {activeDungeon.currentStage < activeDungeon.maxStage && (
                <button
                  className={styles.primaryBtn}
                  style={{ width: 'auto', padding: '12px 24px', marginTop: 0 }}
                  disabled={operating !== null}
                  onClick={handleCompleteStage}
                >
                  {operating ? '...' : '挑战下一关'}
                </button>
              )}
              <button
                className={styles.actionBtn}
                style={{ background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)' }}
                disabled={operating !== null}
                onClick={handleExit}
              >
                退出副本
              </button>
            </div>

            {activeDungeon.currentStage >= activeDungeon.maxStage && (
              <div style={{
                marginTop: '20px', padding: '16px', background: 'rgba(76,175,80,0.1)',
                borderRadius: 'var(--radius-md)', color: 'var(--green, #4caf50)', fontWeight: 600,
              }}>
                🎉 副本通关！
              </div>
            )}
          </div>
        ) : dungeons.length > 0 ? (
          <div className={styles.cardList}>
            {dungeons.map(d => {
              const meta = TYPE_META[d.type] || { icon: '⚔️', label: d.type };
              const isCompleted = d.status === 'COMPLETED';
              return (
                <button
                  key={d.id || d.dungeonId}
                  className={styles.card}
                  onClick={() => setSelected(d)}
                  style={selected?.dungeonId === d.dungeonId ? { borderColor: 'var(--gold)' } : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px' }}>{meta.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p className={styles.cardTitle}>{d.dungeonName}</p>
                      <p className={styles.cardMeta}>
                        {meta.label} · 难度{d.difficulty} · {d.currentStage}/{d.maxStage}关
                        {d.clearCount > 0 && ` · 通关${d.clearCount}次`}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                        background: isCompleted ? 'rgba(76,175,80,0.15)' : 'rgba(201,168,76,0.12)',
                        color: isCompleted ? 'var(--green, #4caf50)' : 'var(--gold-dim)',
                        fontWeight: 600,
                      }}>
                        {STATUS_LABEL[d.status] || d.status}
                      </span>
                    </div>
                  </div>

                  {selected?.dungeonId === d.dungeonId && d.status !== 'IN_PROGRESS' && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--paper-darker)', display: 'flex', gap: '8px' }}>
                      <button
                        className={styles.actionBtn}
                        style={{ marginTop: 0, fontSize: '12px', padding: '6px 16px' }}
                        disabled={operating !== null}
                        onClick={(e) => { e.stopPropagation(); handleEnter(d.dungeonId); }}
                      >
                        {operating === d.dungeonId ? '...' : isCompleted ? '再次挑战' : '进入'}
                      </button>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>🏰</span>
            <p>暂无可用副本</p>
            <p className={styles.hint}>提升等级解锁更多副本</p>
          </div>
        )}
      </div>
    </div>
  );
}
