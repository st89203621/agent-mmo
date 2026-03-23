import React, { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { fetchRelations, fetchRankList, type RankEntryData } from '../../services/api';
import FateBar from '../common/FateBar';
import styles from './PageSkeleton.module.css';

type Tab = 'fate' | 'rank';

const RANK_TYPES = [
  { key: 'level', label: '等级榜' },
  { key: 'power', label: '战力榜' },
  { key: 'wealth', label: '财富榜' },
];

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function AchievementPage() {
  const [tab, setTab] = useState<Tab>('fate');
  const { relations, setRelations } = usePlayerStore();
  const [rankType, setRankType] = useState('level');
  const [rankEntries, setRankEntries] = useState<RankEntryData[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [rankLoading, setRankLoading] = useState(false);

  useEffect(() => {
    if (relations.length === 0) {
      fetchRelations()
        .then((res) => setRelations(res.relations))
        .catch(() => {});
    }
  }, []);

  const loadRank = useCallback(async () => {
    setRankLoading(true);
    try {
      const res = await fetchRankList(rankType);
      setRankEntries(res.entries || []);
      setMyRank(res.myRank);
    } catch { /* noop */ }
    setRankLoading(false);
  }, [rankType]);

  useEffect(() => {
    if (tab === 'rank') loadRank();
  }, [tab, loadRank]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>缘分 · 排行</h2>
      </div>
      <div className={styles.tabRow}>
        <button className={`${styles.tab} ${tab === 'fate' ? styles.tabActive : ''}`}
          onClick={() => setTab('fate')}>缘分谱</button>
        <button className={`${styles.tab} ${tab === 'rank' ? styles.tabActive : ''}`}
          onClick={() => setTab('rank')}>排行榜</button>
      </div>
      <div className={styles.scrollArea}>
        {tab === 'fate' ? (
          relations.length > 0 ? (
            <div className={styles.cardList}>
              {relations.map((r, i) => (
                <div key={r.relationId || i} className={styles.card} style={{ cursor: 'default' }}>
                  <div className={styles.cardTitle}>{r.npcName}</div>
                  <FateBar fateScore={r.fateScore} trustScore={r.trustScore} npcName={r.npcName} />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.placeholderIcon}>💫</span>
              <p>尚无缘分记录</p>
              <p className={styles.hint}>与NPC对话积累缘分</p>
            </div>
          )
        ) : (
          <>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {RANK_TYPES.map(rt => (
                <button
                  key={rt.key}
                  className={styles.optionBtn}
                  style={rankType === rt.key ? { borderColor: 'var(--gold)', background: 'rgba(201,168,76,0.15)', color: 'var(--gold-dim)' } : undefined}
                  onClick={() => setRankType(rt.key)}
                >
                  {rt.label}
                </button>
              ))}
            </div>

            {myRank > 0 && (
              <div style={{
                padding: '10px 14px', marginBottom: '12px',
                background: 'rgba(201,168,76,0.08)', borderRadius: 'var(--radius-md)',
                fontSize: '13px', color: 'var(--gold-dim)', textAlign: 'center',
              }}>
                我的排名：第 {myRank} 名
              </div>
            )}

            {rankLoading ? (
              <div className={styles.empty}><p>加载中...</p></div>
            ) : rankEntries.length > 0 ? (
              <div className={styles.cardList}>
                {rankEntries.map((e, i) => (
                  <div key={i} className={styles.card} style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>
                        {i < 3 ? RANK_MEDALS[i] : `${e.rank}`}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p className={styles.cardTitle}>{e.playerName || `玩家${e.playerId}`}</p>
                        <p className={styles.cardMeta}>Lv.{e.level}</p>
                      </div>
                      <span style={{ fontSize: '16px', color: 'var(--gold)', fontWeight: 700 }}>
                        {e.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <span className={styles.placeholderIcon}>🏆</span>
                <p>暂无排行数据</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
