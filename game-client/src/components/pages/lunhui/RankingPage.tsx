import { useEffect, useState } from 'react';
import { fetchRankings } from '../../../services/api';
import type { RankingEntry } from '../../../types';
import styles from './LunhuiPages.module.css';

const TABS = [
  ['level', '等级'],
  ['combat', '战力'],
  ['consume', '消费'],
  ['fate', '缘分'],
] as const;

type Tab = typeof TABS[number][0];

export default function RankingPage() {
  const [tab, setTab] = useState<Tab>('level');
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState(0);

  useEffect(() => {
    fetchRankings(tab).then((res) => {
      setEntries(res.entries || []);
      setMyRank(res.myRank || 0);
    }).catch(() => setEntries([]));
  }, [tab]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>全服榜单</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>排行榜</div>
          <div className={styles.subtitle}>我的排名 {myRank || '未上榜'}</div>
        </div>
      </div>
      <div className={styles.scroll}>
        <div className={styles.tabs}>
          {TABS.map(([key, label]) => (
            <button key={key} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className={styles.panel}>
          <div className={styles.list}>
            {entries.map((item) => (
              <div key={`${item.rank}-${item.playerId}`} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.stack}>
                    <div className={styles.name}>#{item.rank} · {item.playerName}</div>
                    <div className={styles.meta}>数值 {item.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
