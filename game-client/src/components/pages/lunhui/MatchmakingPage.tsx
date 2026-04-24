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
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>婚 介 馆</span>
            <span className={styles.appbarZone}>{status?.isMarried ? `已婚 · ${status.spouseName}` : '月老牵线 · 缘分匹配'}</span>
          </div>
          <div className={styles.appbarIcons}>
            <div className={styles.appbarIconPlain}>缘</div>
            <div className={styles.appbarIconPlain}>礼</div>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.noticeBoard}>
          <div className={styles.noticeTitle}>{status?.isMarried ? `伴侣 · ${status.spouseName}` : '仍在等待有缘人'}</div>
          <div className={styles.noticeSub}>
            {status?.isMarried
              ? (status.buffDescription || '夫妻同心，战斗与成长都有额外加成。')
              : '在婚介区寻找合拍的玩友，达成默契后即可结缘。'}
          </div>
          {status?.isMarried && (
            <button className={styles.marketMineBtn} onClick={() => divorce().then(load)} type="button">
              解 除 关 系
            </button>
          )}
        </div>

        <div className={styles.sectLine}>推 荐 人 选</div>
        <div className={styles.friendList}>
          {candidates.length === 0 ? (
            <div className={styles.feedEmpty}>暂时还没有匹配对象</div>
          ) : candidates.map((item) => (
            <div key={item.playerId} className={styles.friendRow}>
              <div className={styles.friendAvatar}>{item.name.slice(0, 1)}</div>
              <div className={styles.friendInfo}>
                <div className={styles.friendName}>{item.name}</div>
                <div className={styles.friendMeta}>Lv.{item.level} · 缘分值 {item.fateScore}</div>
                <div className={styles.friendIntro}>媒仙推演：与你气运相合，适合进一步结识。</div>
              </div>
              <div className={styles.friendActions}>
                <button className={styles.friendAction} onClick={() => proposeMarriage(item.playerId).then(load)} type="button">求缘</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
