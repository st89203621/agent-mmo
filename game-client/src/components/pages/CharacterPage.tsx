import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import VisualAssetImage from '../common/VisualAssetImage';
import { characterSceneAsset } from '../../data/visualAssets';
import { toast } from '../../store/toastStore';
import {
  fetchEquipList, fetchRebirthStatus, fetchPersonInfo, allotPersonPoints, resetPersonPoints, logout,
  fetchRelations, fetchRelationDetail, fetchRankList, fetchAchievements, claimAchievementReward,
  type EquipData, type PersonData, type RankEntryData, type AchievementData,
} from '../../services/api';
import type { RelationDetail } from '../../types';
import { QUALITY_NAMES, QUALITY_COLORS } from '../../constants/quality';
import { POSITION_LABELS } from '../../constants/equipment';
import FateBar from '../common/FateBar';
import page from '../../styles/page.module.css';
import own from './CharacterPage.module.css';
import achOwn from './AchievementPage.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const styles = { ...page, ...own, ...achOwn };

type Tab = 'info' | 'achievement' | 'fate' | 'rank';

const ALLOT_STATS: { key: string; label: string; per: number }[] = [
  { key: 'hp', label: '生命', per: 20 },
  { key: 'mp', label: '法力', per: 10 },
  { key: 'physicsAttack', label: '物攻', per: 3 },
  { key: 'physicsDefense', label: '物防', per: 2 },
  { key: 'magicAttack', label: '法攻', per: 3 },
  { key: 'speed', label: '速度', per: 1 },
  { key: 'agility', label: '敏捷', per: 1 },
];

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

export default function CharacterPage() {
  usePageBackground(PAGE_BG.CHARACTER);
  const { playerWorld, gold, diamond, levelInfo } = usePlayerStore();
  const { navigateTo } = useGameStore();
  const pageTab = useGameStore(s => s.pageParams.tab);
  const [tab, setTab] = useState<Tab>('info');
  const [equips, setEquips] = useState<EquipData[]>([]);
  const [worldIndex, setWorldIndex] = useState(0);
  const [rebirthInfo, setRebirthInfo] = useState<{ currentWorldIndex: number; currentBook: string } | null>(null);
  const [person, setPerson] = useState<PersonData | null>(null);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [allocating, setAllocating] = useState(false);
  const loadedRef = useRef(false);

  // 成就
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [achieveCategory, setAchieveCategory] = useState('');
  const [achieveStats, setAchieveStats] = useState({ total: 0, unlocked: 0 });
  const [achieveLoading, setAchieveLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  // 缘分谱
  const { relations, setRelations } = usePlayerStore();
  const [selectedRelation, setSelectedRelation] = useState<RelationDetail | null>(null);
  const [fateDetailLoading, setFateDetailLoading] = useState(false);
  const [fateSortBy, setFateSortBy] = useState<'fate' | 'trust' | 'time'>('fate');

  // 排行
  const [rankType, setRankType] = useState('level');
  const [rankEntries, setRankEntries] = useState<RankEntryData[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [rankLoading, setRankLoading] = useState(false);

  // 支持从外部导航时指定 tab
  useEffect(() => {
    if (pageTab === 'fate') setTab('fate');
    else if (pageTab === 'rank') setTab('rank');
    else if (pageTab === 'achievement') setTab('achievement');
  }, [pageTab]);

  useEffect(() => {
    loadedRef.current = false;
    fetchEquipList().then((res) => setEquips(res.equips)).catch(() => {});
    fetchPersonInfo().then(p => {
      setPerson(p);
      if (p.level) usePlayerStore.getState().setLevelInfo(p.level);
      loadedRef.current = true;
    }).catch(() => {});
    fetchRebirthStatus()
      .then((data) => {
        setRebirthInfo(data);
        setWorldIndex(data.currentWorldIndex);
      })
      .catch(() => {});
  }, []);

  // 等级变化时重新拉取角色属性
  useEffect(() => {
    if (!loadedRef.current || !levelInfo?.level) return;
    fetchPersonInfo().then(p => setPerson(p)).catch(() => {});
  }, [levelInfo?.level]);

  // 成就数据
  const loadAchievements = useCallback(async () => {
    setAchieveLoading(true);
    try {
      const res = await fetchAchievements();
      setAchievements(res.achievements || []);
      setAchieveStats({ total: res.totalCount, unlocked: res.totalUnlocked });
    } catch { /* noop */ }
    setAchieveLoading(false);
  }, []);

  // 排行数据
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
    if (tab === 'fate' && relations.length === 0) {
      fetchRelations().then((res) => setRelations(res.relations)).catch(() => {});
    }
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

  const handleAllot = useCallback(async () => {
    const filtered = Object.fromEntries(Object.entries(pending).filter(([, v]) => v > 0));
    if (Object.keys(filtered).length === 0) return;
    setAllocating(true);
    try {
      await allotPersonPoints(filtered);
      const p = await fetchPersonInfo();
      setPerson(p);
      if (p.level) usePlayerStore.getState().setLevelInfo(p.level);
      setPending({});
    } catch { /* noop */ }
    setAllocating(false);
  }, [pending]);

  const handleReset = useCallback(async () => {
    if (!confirm('重置所有已分配的属性点？')) return;
    setAllocating(true);
    try {
      await resetPersonPoints();
      const p = await fetchPersonInfo();
      setPerson(p);
      if (p.level) usePlayerStore.getState().setLevelInfo(p.level);
      setPending({});
    } catch { /* noop */ }
    setAllocating(false);
  }, []);

  const getEquipForSlot = (position: number) =>
    equips.find((e) => e.position === position);

  const sortedRelations = useMemo(() => [...relations].sort((a, b) => {
    if (fateSortBy === 'fate') return b.fateScore - a.fateScore;
    if (fateSortBy === 'trust') return b.trustScore - a.trustScore;
    return (b.lastInteractTime || 0) - (a.lastInteractTime || 0);
  }), [relations, fateSortBy]);

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
        <h2 className={styles.title}>角色</h2>
        {tab === 'info' && rebirthInfo && <p className={styles.subtitle}>{rebirthInfo.currentBook || '太古'}</p>}
        {tab === 'achievement' && (
          <p className={styles.subtitle}>已解锁 {achieveStats.unlocked}/{achieveStats.total}</p>
        )}
      </div>

      <div className={styles.tabRow}>
        <button className={`${styles.tab} ${tab === 'info' ? styles.tabActive : ''}`}
          onClick={() => setTab('info')}>角色</button>
        <button className={`${styles.tab} ${tab === 'achievement' ? styles.tabActive : ''}`}
          onClick={() => setTab('achievement')}>成就</button>
        <button className={`${styles.tab} ${tab === 'fate' ? styles.tabActive : ''}`}
          onClick={() => setTab('fate')}>缘分谱</button>
        <button className={`${styles.tab} ${tab === 'rank' ? styles.tabActive : ''}`}
          onClick={() => setTab('rank')}>排行榜</button>
      </div>

      {/* ── 角色信息 Tab ── */}
      {tab === 'info' && (
        <>
          {person?.exists && (
            <VisualAssetImage
              {...characterSceneAsset({ profession: person.profession, playerName: person.name })}
              className={styles.charBg}
              showGenerate={false}
              autoGenerate
            >
              <div className={styles.charBgLabel}>
                <div className={styles.charBgName}>{person.name}</div>
                <div className={styles.charBgSub}>{person.profession} · {rebirthInfo?.currentBook || '太古纪元'}</div>
              </div>
            </VisualAssetImage>
          )}
          {/* 七世时间轴 */}
          <div className={styles.timeline}>
            {Array.from({ length: 7 }).map((_, i) => {
              const isActive = i === worldIndex;
              const isDone = playerWorld?.worlds[i]?.status === 'COMPLETED';
              return (
                <button
                  key={i}
                  className={`${styles.worldDot} ${isActive ? styles.active : ''} ${isDone ? styles.done : ''}`}
                  onClick={() => setWorldIndex(i)}
                >
                  <span className={styles.worldNum}>{i + 1}</span>
                  {isActive && <span className={styles.worldLabel}>当前</span>}
                </button>
              );
            })}
          </div>

          <div className={styles.content}>
            {/* 角色基础信息 */}
            {person?.exists && person.basicProperty && (() => {
              const bp = person.basicProperty;
              const eb = equips.reduce(
                (acc, e) => {
                  if (e.fixedProps) {
                    acc.hp += e.fixedProps.hp ?? 0;
                    acc.mp += e.fixedProps.mp ?? 0;
                    acc.physicsAttack += e.fixedProps.physicsAttack ?? 0;
                    acc.physicsDefense += e.fixedProps.physicsDefense ?? 0;
                    acc.magicAttack += e.fixedProps.magicAttack ?? 0;
                    acc.speed += e.fixedProps.speed ?? 0;
                  }
                  return acc;
                },
                { hp: 0, mp: 0, physicsAttack: 0, physicsDefense: 0, magicAttack: 0, speed: 0 }
              );
              return (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    {person.name || '无名侠客'}
                    {person.profession && (
                      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
                        {({ ATTACK: '无坚不摧', DEFENSE: '金刚护体', AGILITY: '行动敏捷' } as Record<string, string>)[person.profession] || person.profession}
                      </span>
                    )}
                  </h3>

                  {levelInfo && (
                    <div className={styles.levelRow}>
                      <span className={styles.levelBadge}>Lv.{levelInfo.level}</span>
                      <div className={styles.expBarWrap}>
                        <div
                          className={styles.expBarFill}
                          style={{ width: `${levelInfo.maxExp > 0 ? Math.min(100, (levelInfo.exp / levelInfo.maxExp) * 100) : 0}%` }}
                        />
                      </div>
                      <span className={styles.expText}>{levelInfo.exp}/{levelInfo.maxExp}</span>
                    </div>
                  )}

                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}><span>生命</span><span className={styles.statVal}>{bp.hp + eb.hp}</span></div>
                    <div className={styles.statItem}><span>法力</span><span className={styles.statVal}>{bp.mp + eb.mp}</span></div>
                    <div className={styles.statItem}><span>物攻</span><span className={styles.statVal}>{bp.physicsAttack + eb.physicsAttack}</span></div>
                    <div className={styles.statItem}><span>物防</span><span className={styles.statVal}>{bp.physicsDefense + eb.physicsDefense}</span></div>
                    <div className={styles.statItem}><span>法攻</span><span className={styles.statVal}>{bp.magicAttack + eb.magicAttack}</span></div>
                    <div className={styles.statItem}><span>速度</span><span className={styles.statVal}>{bp.speed + eb.speed}</span></div>
                  </div>
                  <div className={styles.statsGrid} style={{ marginTop: 8 }}>
                    <div className={styles.statItem}><span>附攻</span><span className={styles.statVal} style={{ color: '#e8a642' }}>{bp.bonusAttack}</span></div>
                    <div className={styles.statItem}><span>附防</span><span className={styles.statVal} style={{ color: '#5ca0d3' }}>{bp.bonusDefense}</span></div>
                    <div className={styles.statItem}><span>敏捷</span><span className={styles.statVal} style={{ color: '#d35c8a' }}>{bp.agility}</span></div>
                    <div className={styles.statItem}><span>暴击</span><span className={styles.statVal} style={{ color: '#d35c8a' }}>{bp.critRate}%</span></div>
                  </div>
                  <div className={styles.statsGrid} style={{ marginTop: 8 }}>
                    <div className={styles.statItem}><span>金币</span><span className={styles.statVal} style={{ color: '#d4a84c' }}>{gold}</span></div>
                    <div className={styles.statItem}><span>钻石</span><span className={styles.statVal} style={{ color: '#7ec8e3' }}>{diamond}</span></div>
                  </div>
                </section>
              );
            })()}

            {/* 属性分配 */}
            {person?.exists && (person.attributePoints ?? 0) > 0 && (() => {
              const used = Object.values(pending).reduce((a, b) => a + b, 0);
              const remaining = (person.attributePoints ?? 0) - used;
              return (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    属性分配
                    <span className={styles.attrPointsBadge}>{remaining} 点可用</span>
                  </h3>
                  <div className={styles.allotGrid}>
                    {ALLOT_STATS.map(({ key, label, per }) => {
                      const pts = pending[key] ?? 0;
                      return (
                        <div key={key} className={styles.allotRow}>
                          <span className={styles.allotLabel}>{label}</span>
                          <span className={styles.allotPer}>+{per}/点</span>
                          <div className={styles.allotControls}>
                            <button className={styles.allotBtn} disabled={pts <= 0}
                              onClick={() => setPending(p => ({ ...p, [key]: Math.max(0, (p[key] ?? 0) - 1) }))}>−</button>
                            <span className={styles.allotCount}>{pts}</span>
                            <button className={styles.allotBtn} disabled={remaining <= 0}
                              onClick={() => setPending(p => ({ ...p, [key]: (p[key] ?? 0) + 1 }))}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {used > 0 && (
                      <button className={styles.allotConfirmBtn} style={{ flex: 1 }} disabled={allocating} onClick={handleAllot}>
                        {allocating ? '...' : `确认分配 (${used}点)`}
                      </button>
                    )}
                    <button
                      className={styles.allotConfirmBtn}
                      style={{ flex: used > 0 ? '0 0 80px' : 1, background: 'var(--paper-darker)', color: 'var(--ink)' }}
                      disabled={allocating}
                      onClick={handleReset}
                    >
                      重置
                    </button>
                  </div>
                </section>
              );
            })()}

            {/* 装备槽 */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>装备</h3>
              <div className={styles.equipGrid}>
                {[1, 2, 3, 4, 5].map((pos) => {
                  const equip = getEquipForSlot(pos);
                  const meta = POSITION_LABELS[pos];
                  return (
                    <button
                      key={pos}
                      className={`${styles.equipSlot} ${equip ? styles.equipped : ''}`}
                      style={equip ? { borderColor: QUALITY_COLORS[equip.quality] || QUALITY_COLORS[0] } : undefined}
                      onClick={() => {
                        if (equip) {
                          navigateTo('equip-detail', { equipId: equip.id });
                        } else {
                          navigateTo('shop');
                        }
                      }}
                    >
                      <span className={styles.equipIcon}>{equip?.icon || meta.icon}</span>
                      {equip ? (
                        <span className={styles.equipName} style={{ color: QUALITY_COLORS[equip.quality] || QUALITY_COLORS[0] }}>
                          {equip.name || `Lv.${equip.level}`}
                        </span>
                      ) : (
                        <span className={styles.equipLabel}>{meta.label}<span style={{ fontSize: 10, opacity: 0.5 }}>（去获取）</span></span>
                      )}
                      {equip && (
                        <span className={styles.qualityDot} style={{ background: QUALITY_COLORS[equip.quality] || QUALITY_COLORS[0] }}>
                          {QUALITY_NAMES[equip.quality] || '普通'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 快捷入口 */}
            <section className={styles.section}>
              <div className={styles.quickLinks}>
                {([
                  ['story', '剧情对话'],
                  ['inventory', '背包'], ['shop', '商城'], ['enchant', '附魔'],
                  ['skill-tree', '技能树'], ['pet', '宠物'], ['companion', '灵侣'],
                  ['dungeon', '副本'], ['quest', '任务'], ['battle', '战斗'],
                  ['rebirth', '轮回'], ['memory', '记忆'],
                  ['book-world', '书库'], ['codex', '图鉴'],
                  ['title', '称号'], ['guild', '盟会'], ['scene', '场景'],
                  ['treasure-mountain', '聚宝山'], ['flower', '情花'],
                  ['trade', '交易'], ['team-battle', '组队PvP'],
                ] as [string, string, Record<string, unknown>?][]).map(([page, label, params]) => (
                  <button key={label} className={styles.quickLink}
                    onClick={() => navigateTo(page as any, params)}>{label}</button>
                ))}
                <button className={styles.quickLink} style={{ color: '#c44e52', borderColor: 'rgba(196,78,82,0.3)' }}
                  onClick={() => { if (confirm('确认退出登录？')) { logout().catch(() => {}); location.reload(); } }}
                >退出账号</button>
              </div>
            </section>
          </div>
        </>
      )}

      {/* ── 成就 Tab ── */}
      {tab === 'achievement' && (
        <div className={styles.scrollArea}>
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
        </div>
      )}

      {/* ── 缘分谱 Tab ── */}
      {tab === 'fate' && (
        <div className={styles.scrollArea}>
          <button className={achOwn.starMapBtn} onClick={() => navigateTo('fate-map')}>
            ✦ 命运星图
          </button>

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

              {(selectedRelation.gender || selectedRelation.age || selectedRelation.features) && (
                <div className={styles.npcTraits}>
                  {selectedRelation.gender && <span className={styles.traitTag}>{selectedRelation.gender}</span>}
                  {selectedRelation.age && <span className={styles.traitTag}>{selectedRelation.age}</span>}
                  {selectedRelation.features && <span className={styles.traitTag}>{selectedRelation.features}</span>}
                </div>
              )}

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
        </div>
      )}

      {/* ── 排行榜 Tab ── */}
      {tab === 'rank' && (
        <div className={styles.scrollArea}>
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
        </div>
      )}
    </div>
  );
}
