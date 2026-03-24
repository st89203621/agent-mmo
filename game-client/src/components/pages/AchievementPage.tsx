import React, { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import {
  fetchRelations, fetchRankList, fetchAchievements, claimAchievementReward,
  type RankEntryData, type AchievementData,
} from '../../services/api';
import FateBar from '../common/FateBar';
import styles from './AchievementPage.module.css';

type Tab = 'achievement' | 'fate' | 'rank';

const ACHIEVEMENT_CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'explore', label: '探索' },
  { key: 'battle', label: '战斗' },
  { key: 'social', label: '社交' },
  { key: 'collect', label: '收集' },
  { key: 'growth', label: '成长' },
];

const RANK_TYPES = [
  { key: 'level', label: '等级榜' },
  { key: 'power', label: '战力榜' },
  { key: 'wealth', label: '财富榜' },
];

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function AchievementPage() {
  const [tab, setTab] = useState<Tab>('achievement');
  const { relations, setRelations } = usePlayerStore();
  const { navigateTo } = useGameStore();

  // 成就
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [achieveCategory, setAchieveCategory] = useState('');
  const [achieveStats, setAchieveStats] = useState({ total: 0, unlocked: 0 });
  const [achieveLoading, setAchieveLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  // 排行
  const [rankType, setRankType] = useState('level');
  const [rankEntries, setRankEntries] = useState<RankEntryData[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [rankLoading, setRankLoading] = useState(false);

  useEffect(() => {
    if (relations.length === 0) {
      fetchRelations().then((res) => setRelations(res.relations)).catch(() => {});
    }
  }, []);

  const loadAchievements = useCallback(async () => {
    setAchieveLoading(true);
    try {
      const res = await fetchAchievements();
      setAchievements(res.achievements || []);
      setAchieveStats({ total: res.totalCount, unlocked: res.totalUnlocked });
    } catch { /* noop */ }
    setAchieveLoading(false);
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
    if (tab === 'achievement') loadAchievements();
    if (tab === 'rank') loadRank();
  }, [tab, loadAchievements, loadRank]);

  const handleClaim = useCallback(async (id: string) => {
    setClaiming(id);
    try {
      const res = await claimAchievementReward(id);
      toast.reward(`领取成功：${res.reward}`);
      loadAchievements();
    } catch {
      toast.error('领取失败');
    }
    setClaiming(null);
  }, [loadAchievements]);

  const filteredAchievements = achieveCategory
    ? achievements.filter((a) => a.category === achieveCategory)
    : achievements;

  const unlockedFirst = [...filteredAchievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (!a.unlocked && !b.unlocked) {
      const aPct = a.target > 0 ? a.progress / a.target : 0;
      const bPct = b.target > 0 ? b.progress / b.target : 0;
      return bPct - aPct;
    }
    return 0;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>成就 · 缘分</h2>
        {tab === 'achievement' && (
          <p className={styles.subtitle}>
            已解锁 {achieveStats.unlocked}/{achieveStats.total}
          </p>
        )}
      </div>

      <div className={styles.tabRow}>
        <button className={`${styles.tab} ${tab === 'achievement' ? styles.tabActive : ''}`}
          onClick={() => setTab('achievement')}>成就</button>
        <button className={`${styles.tab} ${tab === 'fate' ? styles.tabActive : ''}`}
          onClick={() => setTab('fate')}>缘分谱</button>
        <button className={`${styles.tab} ${tab === 'rank' ? styles.tabActive : ''}`}
          onClick={() => setTab('rank')}>排行榜</button>
      </div>

      <div className={styles.scrollArea}>
        {/* ── 成就标签页 ── */}
        {tab === 'achievement' && (
          <>
            <div className={styles.categoryRow}>
              {ACHIEVEMENT_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  className={`${styles.categoryBtn} ${achieveCategory === c.key ? styles.categoryActive : ''}`}
                  onClick={() => setAchieveCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {achieveLoading ? (
              <div className={styles.empty}><p>加载中...</p></div>
            ) : unlockedFirst.length > 0 ? (
              <div className={styles.achieveList}>
                {unlockedFirst.map((a) => (
                  <div key={a.id} className={`${styles.achieveCard} ${a.unlocked ? styles.achieveUnlocked : ''}`}>
                    <div className={styles.achieveIcon}>{a.icon || '🏅'}</div>
                    <div className={styles.achieveInfo}>
                      <div className={styles.achieveName}>{a.name}</div>
                      <div className={styles.achieveDesc}>{a.description}</div>
                      {!a.unlocked && a.target > 0 && (
                        <div className={styles.achieveProgress}>
                          <div className={styles.achieveBar}>
                            <div
                              className={styles.achieveBarFill}
                              style={{ width: `${Math.min(100, (a.progress / a.target) * 100)}%` }}
                            />
                          </div>
                          <span className={styles.achievePct}>{a.progress}/{a.target}</span>
                        </div>
                      )}
                    </div>
                    {a.unlocked ? (
                      <div className={styles.achieveCheck}>✓</div>
                    ) : a.progress >= a.target && a.target > 0 ? (
                      <button
                        className={styles.claimBtn}
                        disabled={claiming === a.id}
                        onClick={() => handleClaim(a.id)}
                      >
                        领取
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <span className={styles.placeholderIcon}>🏅</span>
                <p>暂无成就数据</p>
                <p className={styles.hint}>探索世界解锁成就</p>
              </div>
            )}
          </>
        )}

        {/* ── 缘分谱 ── */}
        {tab === 'fate' && (
          relations.length > 0 ? (
            <div className={styles.fateList}>
              {relations.map((r, i) => (
                <button
                  key={r.relationId || i}
                  className={styles.fateCard}
                  onClick={() => navigateTo('story')}
                >
                  <div className={styles.fateAvatar}>{r.npcName.charAt(0)}</div>
                  <div className={styles.fateInfo}>
                    <div className={styles.fateName}>{r.npcName}</div>
                    <FateBar fateScore={r.fateScore} trustScore={r.trustScore} npcName={r.npcName} />
                    {r.keyFacts && r.keyFacts.length > 0 && (
                      <div className={styles.fateKeyFact}>
                        {r.keyFacts[r.keyFacts.length - 1]}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.placeholderIcon}>💫</span>
              <p>尚无缘分记录</p>
              <p className={styles.hint}>与NPC对话积累缘分</p>
            </div>
          )
        )}

        {/* ── 排行榜 ── */}
        {tab === 'rank' && (
          <>
            <div className={styles.categoryRow}>
              {RANK_TYPES.map((rt) => (
                <button
                  key={rt.key}
                  className={`${styles.categoryBtn} ${rankType === rt.key ? styles.categoryActive : ''}`}
                  onClick={() => setRankType(rt.key)}
                >
                  {rt.label}
                </button>
              ))}
            </div>

            {myRank > 0 && (
              <div className={styles.myRankBanner}>
                我的排名：第 <strong>{myRank}</strong> 名
              </div>
            )}

            {rankLoading ? (
              <div className={styles.empty}><p>加载中...</p></div>
            ) : rankEntries.length > 0 ? (
              <div className={styles.rankList}>
                {rankEntries.map((e, i) => (
                  <div key={i} className={`${styles.rankItem} ${i < 3 ? styles.rankTop : ''}`}>
                    <span className={styles.rankPos}>
                      {i < 3 ? RANK_MEDALS[i] : `${e.rank}`}
                    </span>
                    <div className={styles.rankInfo}>
                      <span className={styles.rankName}>{e.playerName || `玩家${e.playerId}`}</span>
                      <span className={styles.rankLevel}>Lv.{e.level}</span>
                    </div>
                    <span className={styles.rankValue}>{e.value}</span>
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
