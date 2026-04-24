import { useCallback, useEffect, useState } from 'react';
import { divorce, fetchMarriageStatus, fetchMatchmakingList, proposeMarriage } from '../../../services/api';
import styles from './LunhuiPages.module.css';

interface Candidate {
  playerId: number;
  name: string;
  level: number;
  fateScore: number;
  portraitUrl?: string;
}

export default function MatchmakingPage() {
  const [status, setStatus] = useState<{ isMarried: boolean; spouseName?: string; marriageDate?: number; buffDescription?: string } | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const load = useCallback(() => {
    fetchMarriageStatus().then(setStatus).catch(() => setStatus({ isMarried: false }));
    fetchMatchmakingList().then((res) => setCandidates(res.candidates || [])).catch(() => setCandidates([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>婚介 / 缘分</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>婚介</div>
          <div className={styles.subtitle}>{status?.isMarried ? '已婚' : '未婚'}</div>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>当前状态</span>
          </div>
          <div className={styles.card}>
            <div className={styles.name}>{status?.isMarried ? `伴侣 · ${status.spouseName}` : '仍在寻觅有缘人'}</div>
            <div className={styles.desc}>
              {status?.isMarried
                ? (status.buffDescription || '夫妻同心，战斗与成长都有额外加成。')
                : '在婚介区寻找合拍的玩友，达成默契后即可结缘。'}
            </div>
            {status?.isMarried && (
              <button className={`${styles.button} ${styles.buttonDanger}`} onClick={() => divorce().then(load)}>
                解除关系
              </button>
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>推荐人选</span>
          </div>
          <div className={styles.list}>
            {candidates.map((item) => (
              <div key={item.playerId} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.stack}>
                    <div className={styles.name}>{item.name}</div>
                    <div className={styles.meta}>Lv.{item.level} · 缘分值 {item.fateScore}</div>
                  </div>
                  <button className={styles.button} onClick={() => proposeMarriage(item.playerId).then(load)}>
                    求缘
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
