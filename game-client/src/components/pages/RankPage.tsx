import React, { useEffect, useState, useCallback } from 'react';
import { fetchRankList, type RankEntryData } from '../../services/api';
import styles from './PageSkeleton.module.css';

const RANK_TYPES = [
  { key: 'level', label: '等级榜' },
  { key: 'power', label: '战力榜' },
  { key: 'wealth', label: '财富榜' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankPage() {
  const [type, setType] = useState('level');
  const [entries, setEntries] = useState<RankEntryData[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRankList(type);
      setEntries(res.entries || []);
      setMyRank(res.myRank);
    } catch { /* noop */ }
    setLoading(false);
  }, [type]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>排行榜</h2>
        {myRank > 0 && <p className={styles.subtitle}>我的排名：第 {myRank} 名</p>}
      </div>
      <div className={styles.tabRow}>
        {RANK_TYPES.map(rt => (
          <button key={rt.key} className={`${styles.tab} ${type === rt.key ? styles.tabActive : ''}`}
            onClick={() => setType(rt.key)}>{rt.label}</button>
        ))}
      </div>
      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : entries.length > 0 ? (
          <div className={styles.cardList}>
            {entries.map((e, i) => (
              <div key={i} className={styles.card} style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>
                    {i < 3 ? MEDALS[i] : `${e.rank}`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p className={styles.cardTitle}>{e.playerName || `玩家${e.playerId}`}</p>
                    <p className={styles.cardMeta}>Lv.{e.level}</p>
                  </div>
                  <span style={{ fontSize: '16px', color: 'var(--gold)', fontWeight: 700 }}>{e.value}</span>
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
      </div>
    </div>
  );
}
