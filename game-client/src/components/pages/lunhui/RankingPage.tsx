import { useEffect, useState } from 'react';
import { fetchRankings } from '../../../services/api';
import type { RankingEntry } from '../../../types';
import styles from './LunhuiPages.module.css';
import { usePageBackground } from '../../common/PageShell';
import { PAGE_BG } from '../../../data/pageBackgrounds';

const TABS = [
  ['level', '等级'],
  ['combat', '战力'],
  ['consume', '消费'],
  ['fate', '缘分'],
] as const;

type Tab = typeof TABS[number][0];

export default function RankingPage() {
  usePageBackground(PAGE_BG.RANKING);
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
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>排 行 榜</span>
            <span className={styles.appbarZone}>我的排名 {myRank || '未上榜'}</span>
          </div>
        </div>
      </div>

      <div className={styles.marketTabs}>
        {TABS.map(([key, label]) => (
          <button key={key} className={`${styles.marketTab} ${tab === key ? styles.marketTabOn : ''}`.trim()} onClick={() => setTab(key)} type="button">
            {label}
          </button>
        ))}
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.rankList}>
          {entries.length === 0 ? (
            <div className={styles.feedEmpty}>暂无排行数据</div>
          ) : entries.map((item) => (
            <div key={`${item.rank}-${item.playerId}`} className={styles.rankRow}>
              <div className={styles.rankIndex}>#{item.rank}</div>
              <div className={styles.rankMain}>
                <div className={styles.rankName}>{item.playerName}</div>
                <div className={styles.rankMeta}>玩家 ID {item.playerId}</div>
              </div>
              <div className={styles.rankValue}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
