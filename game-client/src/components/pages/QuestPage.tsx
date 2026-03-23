import React, { useEffect, useState, useCallback } from 'react';
import { fetchQuests, fetchAvailableQuests, acceptQuest, abandonQuest, type QuestData } from '../../services/api';
import styles from './PageSkeleton.module.css';

const QUEST_TYPE_LABELS: Record<number, string> = {
  0: '主线', 1: '师门', 2: '区域', 3: '副本', 4: '卷轴', 5: '材料', 6: '隐藏',
};

const STATUS_LABELS: Record<number, string> = {
  0: '可接取', 1: '进行中', 2: '已完成', 3: '已领奖', 4: '已放弃',
};

type Tab = 'accepted' | 'available';

export default function QuestPage() {
  const [tab, setTab] = useState<Tab>('accepted');
  const [myQuests, setMyQuests] = useState<QuestData[]>([]);
  const [available, setAvailable] = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, avail] = await Promise.all([
        fetchQuests(),
        fetchAvailableQuests(),
      ]);
      setMyQuests(mine.quests || []);
      setAvailable(avail.quests || []);
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAccept = useCallback(async (questId: string) => {
    setOperating(questId);
    try {
      await acceptQuest(questId);
      await loadData();
    } catch { /* noop */ }
    setOperating(null);
  }, [loadData]);

  const handleAbandon = useCallback(async (questId: string) => {
    setOperating(questId);
    try {
      await abandonQuest(questId);
      await loadData();
    } catch { /* noop */ }
    setOperating(null);
  }, [loadData]);

  const activeQuests = myQuests.filter(q => q.status === 1);
  const completedQuests = myQuests.filter(q => q.status === 2 || q.status === 3);

  const renderQuest = (quest: QuestData, mode: 'mine' | 'available') => {
    const progress = quest.target > 0
      ? Math.min(100, Math.round((quest.progress / quest.target) * 100))
      : 0;
    const isOperating = operating === quest.questId;

    return (
      <div key={quest.questId} className={styles.card} style={{ cursor: 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className={styles.cardTitle}>{quest.name}</p>
          <span style={{
            fontSize: '11px', padding: '2px 8px',
            background: 'rgba(201,168,76,0.12)', borderRadius: '999px',
            color: 'var(--gold-dim)', fontWeight: 600,
          }}>
            {QUEST_TYPE_LABELS[quest.type] ?? '未知'}
          </span>
        </div>

        {quest.description && (
          <p className={styles.cardDesc}>{quest.description}</p>
        )}

        {mode === 'mine' && quest.status === 1 && quest.target > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '11px', color: 'var(--ink)', opacity: 0.6, marginBottom: '4px',
            }}>
              <span>进度</span>
              <span>{quest.progress} / {quest.target}</span>
            </div>
            <div style={{
              height: '4px', background: 'var(--paper-darker)', borderRadius: '2px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: progress >= 100 ? 'var(--green)' : 'var(--gold)',
                borderRadius: '2px', transition: 'width 0.3s',
              }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span className={styles.cardMeta}>
            {quest.level > 0 ? `Lv.${quest.level}` : ''}
            {quest.rewards ? ` · ${quest.rewards}` : ''}
          </span>

          {mode === 'available' && (
            <button
              className={styles.actionBtn}
              style={{ marginTop: 0, fontSize: '12px', padding: '4px 12px' }}
              disabled={isOperating}
              onClick={() => handleAccept(quest.questId)}
            >
              {isOperating ? '...' : '接取'}
            </button>
          )}

          {mode === 'mine' && quest.status === 1 && (
            <button
              style={{
                background: 'none', border: '1px solid var(--paper-darker)',
                borderRadius: 'var(--radius-md)', padding: '4px 12px',
                fontSize: '12px', color: 'var(--ink)', opacity: 0.6, cursor: 'pointer',
              }}
              disabled={isOperating}
              onClick={() => handleAbandon(quest.questId)}
            >
              {isOperating ? '...' : '放弃'}
            </button>
          )}

          {mode === 'mine' && (quest.status === 2 || quest.status === 3) && (
            <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>
              {STATUS_LABELS[quest.status]}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>任务</h2>
        <p className={styles.subtitle}>
          进行中 {activeQuests.length} · 已完成 {completedQuests.length}
        </p>
      </div>

      <div className={styles.tabRow}>
        <button
          className={`${styles.tab} ${tab === 'accepted' ? styles.tabActive : ''}`}
          onClick={() => setTab('accepted')}
        >
          我的任务
        </button>
        <button
          className={`${styles.tab} ${tab === 'available' ? styles.tabActive : ''}`}
          onClick={() => setTab('available')}
        >
          可接取
        </button>
      </div>

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : tab === 'accepted' ? (
          myQuests.length > 0 ? (
            <div className={styles.cardList}>
              {activeQuests.map(q => renderQuest(q, 'mine'))}
              {completedQuests.map(q => renderQuest(q, 'mine'))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.placeholderIcon}>📜</span>
              <p>暂无任务</p>
              <p className={styles.hint}>切换到「可接取」查看可用任务</p>
            </div>
          )
        ) : (
          available.length > 0 ? (
            <div className={styles.cardList}>
              {available.map(q => renderQuest(q, 'available'))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.placeholderIcon}>📜</span>
              <p>暂无可接取任务</p>
              <p className={styles.hint}>提升等级解锁更多任务</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
