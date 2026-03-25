import React, { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import {
  fetchRelations, fetchRelationDetail, fetchRankList, fetchAchievements, claimAchievementReward,
  type RankEntryData, type AchievementData,
} from '../../services/api';
import type { RelationDetail } from '../../types';
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

const MILESTONE_LABELS: Record<number, string> = {
  60: '缘起', 80: '情深', 95: '命定',
};

const FATE_LEVEL_LABELS: { min: number; label: string; color: string }[] = [
  { min: 80, label: '情深缘定', color: '#c04060' },
  { min: 60, label: '心意相通', color: '#c08040' },
  { min: 30, label: '渐生情愫', color: '#7ca8c6' },
  { min: 0, label: '萍水相逢', color: '#9e9e9e' },
];

function getFateLevel(score: number) {
  return FATE_LEVEL_LABELS.find(l => score >= l.min) || FATE_LEVEL_LABELS[3];
}

export default function AchievementPage() {
  const [tab, setTab] = useState<Tab>('achievement');
  const { relations, setRelations } = usePlayerStore();
  const { navigateTo, pageParams } = useGameStore();

  // 成就
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [achieveCategory, setAchieveCategory] = useState('');
  const [achieveStats, setAchieveStats] = useState({ total: 0, unlocked: 0 });
  const [achieveLoading, setAchieveLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  // 缘分谱
  const [selectedRelation, setSelectedRelation] = useState<RelationDetail | null>(null);
  const [fateDetailLoading, setFateDetailLoading] = useState(false);
  const [fateSortBy, setFateSortBy] = useState<'fate' | 'trust' | 'time'>('fate');

  // 排行
  const [rankType, setRankType] = useState('level');
  const [rankEntries, setRankEntries] = useState<RankEntryData[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [rankLoading, setRankLoading] = useState(false);

  // 支持从外部导航时指定 tab（如角色页快捷入口"因缘谱"）
  useEffect(() => {
    if (pageParams.tab === 'fate' || pageParams.tab === 'rank') {
      setTab(pageParams.tab as Tab);
    }
  }, [pageParams.tab]);

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

  const handleOpenRelation = useCallback(async (npcId: string, worldIndex: number) => {
    setFateDetailLoading(true);
    try {
      const detail = await fetchRelationDetail(npcId, worldIndex);
      setSelectedRelation(detail);
    } catch {
      toast.error('加载关系详情失败');
    }
    setFateDetailLoading(false);
  }, []);

  const sortedRelations = [...relations].sort((a, b) => {
    if (fateSortBy === 'fate') return b.fateScore - a.fateScore;
    if (fateSortBy === 'trust') return b.trustScore - a.trustScore;
    return (b.lastInteractTime || 0) - (a.lastInteractTime || 0);
  });

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
          <>
            {/* 关系详情弹窗 */}
            {selectedRelation && (
              <div className={styles.fateDetail}>
                <div className={styles.fateDetailHeader}>
                  <div className={styles.fateDetailAvatar}>
                    {selectedRelation.imageUrl ? (
                      <img src={selectedRelation.imageUrl} alt="" className={styles.fateDetailImg}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : null}
                    <span className={styles.fateDetailChar}>{(selectedRelation.npcName || '?').charAt(0)}</span>
                  </div>
                  <div className={styles.fateDetailInfo}>
                    <div className={styles.fateDetailName}>{selectedRelation.npcName || '未知'}</div>
                    <div className={styles.fateDetailSub}>
                      {selectedRelation.bookTitle && <span>{selectedRelation.bookTitle}</span>}
                      {selectedRelation.role && <span> · {selectedRelation.role}</span>}
                    </div>
                    {selectedRelation.personality && (
                      <div className={styles.fateDetailPersonality}>{selectedRelation.personality}</div>
                    )}
                  </div>
                  <button className={styles.fateDetailClose} onClick={() => setSelectedRelation(null)}>收起</button>
                </div>

                <FateBar fateScore={selectedRelation.fateScore ?? 0} trustScore={selectedRelation.trustScore ?? 0} npcName={selectedRelation.npcName || '未知'} />

                {/* 里程碑 */}
                <div className={styles.milestoneRow}>
                  {[60, 80, 95].map(ms => {
                    const reached = (selectedRelation.fateScore ?? 0) >= ms;
                    return (
                      <div key={ms} className={`${styles.milestoneItem} ${reached ? styles.milestoneReached : ''}`}>
                        <span className={styles.milestoneNum}>{ms}</span>
                        <span className={styles.milestoneLabel}>{MILESTONE_LABELS[ms]}</span>
                      </div>
                    );
                  })}
                </div>

                {/* NPC特征 */}
                {(selectedRelation.gender || selectedRelation.age || selectedRelation.features) && (
                  <div className={styles.npcTraits}>
                    {selectedRelation.gender && <span className={styles.traitTag}>{selectedRelation.gender}</span>}
                    {selectedRelation.age && <span className={styles.traitTag}>{selectedRelation.age}</span>}
                    {selectedRelation.features && <span className={styles.traitTag}>{selectedRelation.features}</span>}
                  </div>
                )}

                {/* 关键事件 */}
                {selectedRelation.keyFacts && selectedRelation.keyFacts.length > 0 && (
                  <div className={styles.keyFactsSection}>
                    <div className={styles.keyFactsTitle}>关键事件</div>
                    <div className={styles.keyFactsList}>
                      {selectedRelation.keyFacts.map((fact, i) => (
                        <div key={i} className={styles.keyFactItem}>{fact}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 关联记忆碎片 */}
                {selectedRelation.memories && selectedRelation.memories.length > 0 && (
                  <div className={styles.keyFactsSection}>
                    <div className={styles.keyFactsTitle}>记忆碎片</div>
                    <div className={styles.keyFactsList}>
                      {selectedRelation.memories.map(m => (
                        <div key={m.id} className={styles.keyFactItem}>
                          {m.locked ? '???' : m.title}
                          {!m.locked && m.fateScore > 0 && <span className={styles.memoryFate}> · 缘{m.fateScore}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className={styles.goStoryBtn} onClick={() => navigateTo('story')}>前往对话</button>
              </div>
            )}

            {/* 排序按钮 */}
            {relations.length > 0 && !selectedRelation && (
              <div className={styles.categoryRow}>
                {([
                  { key: 'fate' as const, label: '缘分排序' },
                  { key: 'trust' as const, label: '信任排序' },
                  { key: 'time' as const, label: '最近互动' },
                ]).map(s => (
                  <button
                    key={s.key}
                    className={`${styles.categoryBtn} ${fateSortBy === s.key ? styles.categoryActive : ''}`}
                    onClick={() => setFateSortBy(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {!selectedRelation && (
              sortedRelations.length > 0 ? (
                <div className={styles.fateList}>
                  {sortedRelations.map((r, i) => {
                    const name = r.npcName || '未知';
                    const level = getFateLevel(r.fateScore ?? 0);
                    return (
                      <button
                        key={r.relationId || i}
                        className={styles.fateCard}
                        onClick={() => handleOpenRelation(r.npcId, r.worldIndex || 0)}
                        disabled={fateDetailLoading}
                      >
                        <div className={styles.fateAvatar} style={{ borderColor: level.color }}>
                          {r.imageUrl ? (
                            <img src={r.imageUrl} alt="" className={styles.fateAvatarImg}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : null}
                          <span>{name.charAt(0)}</span>
                        </div>
                        <div className={styles.fateInfo}>
                          <div className={styles.fateNameRow}>
                            <span className={styles.fateName}>{name}</span>
                            <span className={styles.fateLevel} style={{ color: level.color }}>{level.label}</span>
                          </div>
                          <FateBar fateScore={r.fateScore ?? 0} trustScore={r.trustScore ?? 0} npcName={name} compact />
                          {r.milestone > 0 && (
                            <span className={styles.fateMilestone}>
                              {MILESTONE_LABELS[r.milestone] || `里程碑${r.milestone}`}
                            </span>
                          )}
                          {r.keyFacts && r.keyFacts.length > 0 && (
                            <div className={styles.fateKeyFact}>
                              {r.keyFacts[r.keyFacts.length - 1]}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.empty}>
                  <span className={styles.placeholderIcon}>&#128171;</span>
                  <p>尚无缘分记录</p>
                  <p className={styles.hint}>与NPC对话积累缘分</p>
                </div>
              )
            )}
          </>
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
