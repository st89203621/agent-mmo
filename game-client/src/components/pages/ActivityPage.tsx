import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import {
  fetchCheckinStatus, doCheckin, fetchOnlineRewards, claimOnlineReward,
  fetchRankList, type RankEntryData, type OnlineRewardData,
} from '../../services/api';
import page from '../../styles/page.module.css';
import own from './ActivityPage.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const styles = { ...page, ...own };

interface ActivityDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tag: 'hot' | 'new' | 'daily' | 'limited';
  tagLabel: string;
  glowColor: string;
  wide?: boolean;
  countdown?: boolean;
  navigateTo?: string;
}

const ACTIVITIES: ActivityDef[] = [
  {
    id: 'chaos-boss',
    name: '诸神黄昏',
    desc: '混沌魔神降临，全服联手讨伐！伤害排名瓜分神器碎片与太古灵石',
    icon: '👹',
    tag: 'hot',
    tagLabel: '全服热战',
    glowColor: 'radial-gradient(circle, rgba(220,60,60,0.2), transparent 70%)',
    wide: true,
    countdown: true,
    navigateTo: 'world-boss',
  },
  {
    id: 'spirit-summon',
    name: '万灵降世',
    desc: '远古神宠沉睡于星辰之间，消耗灵石唤醒SSR守护灵兽',
    icon: '🐉',
    tag: 'hot',
    tagLabel: 'SSR概率UP',
    glowColor: 'radial-gradient(circle, rgba(180,120,220,0.25), transparent 70%)',
    navigateTo: 'pet-summon',
  },
  {
    id: 'destiny-wheel',
    name: '天命之轮',
    desc: '每日免费转动命运齿轮，紫金装备、技能秘籍、万年灵药随机掉落',
    icon: '🎡',
    tag: 'daily',
    tagLabel: '每日免费',
    glowColor: 'radial-gradient(circle, rgba(201,168,76,0.25), transparent 70%)',
    navigateTo: 'wheel',
  },
  {
    id: 'mystic-tome',
    name: '太古秘典',
    desc: '开启洪荒秘典宝箱，获得失传绝技——逆天改命、焚天灭地、万剑归宗',
    icon: '📜',
    tag: 'new',
    tagLabel: '新活动',
    glowColor: 'radial-gradient(circle, rgba(80,180,120,0.25), transparent 70%)',
    navigateTo: 'mystic-tome',
  },
  {
    id: 'treasure-war',
    name: '夺宝奇兵',
    desc: '盟会攻防对决，攻占宝山据点，争夺稀世珍宝与盟会荣耀勋章',
    icon: '⚔️',
    tag: 'limited',
    tagLabel: '限时开启',
    glowColor: 'radial-gradient(circle, rgba(200,120,60,0.25), transparent 70%)',
    navigateTo: 'treasure-mountain',
  },
  {
    id: 'celestial-tower',
    name: '通天之塔',
    desc: '无尽试炼一百零八层，每十层一个隐藏Boss，登顶者获称号"逆天者"',
    icon: '🗼',
    tag: 'daily',
    tagLabel: '每日挑战',
    glowColor: 'radial-gradient(circle, rgba(100,140,220,0.25), transparent 70%)',
    navigateTo: 'dungeon',
  },
  {
    id: 'fortune-realm',
    name: '鸿蒙秘境',
    desc: '限时开放的上古遗迹，经验翻倍、稀有怪物刷新、隐藏宝箱遍布',
    icon: '🌀',
    tag: 'limited',
    tagLabel: '限时48h',
    glowColor: 'radial-gradient(circle, rgba(120,200,200,0.25), transparent 70%)',
    countdown: true,
    navigateTo: 'secret-realm',
  },
  {
    id: 'heavenly-arena',
    name: '乾坤擂台',
    desc: '实时跨服对决，赛季积分争霸！前十封神榜留名，专属光效加冕',
    icon: '🏟️',
    tag: 'hot',
    tagLabel: '赛季进行中',
    glowColor: 'radial-gradient(circle, rgba(220,60,120,0.25), transparent 70%)',
    navigateTo: 'team-battle',
  },
];

function useCountdown(targetMinutes: number) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const end = Date.now() + targetMinutes * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMinutes]);
  return remaining;
}

const TAG_CLASS: Record<string, string> = {
  hot: 'actTagHot',
  new: 'actTagNew',
  daily: 'actTagDaily',
  limited: 'actTagLimited',
};

type MainTab = 'events' | 'rewards' | 'ranking';

const RANK_TYPES = [
  { key: 'level',   label: '等级榜' },
  { key: 'combat',  label: '战力榜' },
  { key: 'consume', label: '消费榜' },
  { key: 'fate',    label: '缘分榜' },
] as const;

export default function ActivityPage() {
  usePageBackground(PAGE_BG.ACTIVITY);
  const navigateTo = useGameStore(s => s.navigateTo);
  const bossCountdown = useCountdown(127);
  const realmCountdown = useCountdown(2880);

  const [mainTab, setMainTab] = useState<MainTab>('events');

  // 签到数据
  const [checkin, setCheckin] = useState<{ todayChecked: boolean; consecutiveDays: number; totalDays: number } | null>(null);
  // 在线奖励数据
  const [onlineRewards, setOnlineRewards] = useState<OnlineRewardData[]>([]);
  const [onlineMinutes, setOnlineMinutes] = useState(0);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  // 排行榜
  const [rankType, setRankType] = useState<'level'|'combat'|'consume'|'fate'>('level');
  const [rankEntries, setRankEntries] = useState<RankEntryData[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [loadingRank, setLoadingRank] = useState(false);

  const wideActivities = ACTIVITIES.filter(a => a.wide);
  const normalActivities = ACTIVITIES.filter(a => !a.wide);

  const handleClick = (act: ActivityDef) => {
    if (act.navigateTo) navigateTo(act.navigateTo as any);
    else toast.info(`${act.name} 即将开放，敬请期待！`);
  };

  // 加载签到 + 在线奖励
  useEffect(() => {
    if (mainTab !== 'rewards') return;
    setLoadingRewards(true);
    Promise.all([
      fetchCheckinStatus().catch(() => null),
      fetchOnlineRewards().catch(() => ({ rewards: [], onlineMinutes: 0 })),
    ]).then(([ci, or]) => {
      setCheckin(ci);
      setOnlineRewards(or.rewards || []);
      setOnlineMinutes(or.onlineMinutes || 0);
    }).finally(() => setLoadingRewards(false));
  }, [mainTab]);

  // 加载排行榜
  useEffect(() => {
    if (mainTab !== 'ranking') return;
    setLoadingRank(true);
    fetchRankList(rankType, 50).then(res => {
      setRankEntries(res.entries || []);
      setMyRank(res.myRank || 0);
    }).catch(() => setRankEntries([])).finally(() => setLoadingRank(false));
  }, [mainTab, rankType]);

  const handleCheckin = useCallback(async () => {
    if (checkin?.todayChecked) return;
    try {
      const res = await doCheckin();
      setCheckin(res);
      toast.reward(`签到成功！连续${res.consecutiveDays}天`);
    } catch { toast.error('签到失败'); }
  }, [checkin]);

  const handleClaimOnline = useCallback(async (rewardId: string) => {
    setClaimingId(rewardId);
    try {
      const res = await claimOnlineReward(rewardId);
      toast.reward(res.reward || '领取成功！');
      setOnlineRewards(prev => prev.map(r => r.rewardId === rewardId ? { ...r, claimed: true } : r));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '领取失败');
    }
    setClaimingId(null);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>活动中心</h2>
        <p className={styles.subtitle}>限时盛典 · 奇遇不断</p>
      </div>

      {/* 主 Tab */}
      <div className={styles.tabRow}>
        {([['events','热门活动'],['rewards','在线领奖'],['ranking','排行榜']] as [MainTab,string][]).map(([k,l]) => (
          <button
            key={k}
            className={`${styles.tab} ${mainTab === k ? styles.tabActive : ''}`}
            onClick={() => setMainTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className={styles.scrollArea}>
        {/* ── 热门活动 ── */}
        {mainTab === 'events' && (
          <>
            <div className={styles.banner}>
              <div className={styles.bannerGlow} />
              <div className={styles.bannerTitle}>七世轮回 · 诸神降临</div>
              <div className={styles.bannerDesc}>参与活动赢取神器碎片、太古秘典、SSR神宠</div>
            </div>
            {wideActivities.map(act => (
              <button key={act.id} className={`${styles.actCard} ${styles.actCardWide}`} onClick={() => handleClick(act)}>
                <span className={styles.actIcon}>{act.icon}</span>
                <div className={styles.actInfo}>
                  <div className={styles.actName}>{act.name}</div>
                  <div className={styles.actDesc}>{act.desc}</div>
                  <span className={`${styles.actTag} ${styles[TAG_CLASS[act.tag]]}`}>{act.tagLabel}</span>
                  {act.id === 'chaos-boss' && <div className={styles.actCountdown}>距下次刷新 {bossCountdown}</div>}
                </div>
                <span className={styles.actArrow}>›</span>
              </button>
            ))}
            <div className={styles.sectionLabel}>更多活动</div>
            <div className={styles.actGrid}>
              {normalActivities.map(act => (
                <button key={act.id} className={styles.actCard} onClick={() => handleClick(act)}>
                  <div className={styles.actCardGlow} style={{ background: act.glowColor }} />
                  <span className={styles.actIcon}>{act.icon}</span>
                  <div className={styles.actName}>{act.name}</div>
                  <div className={styles.actDesc}>{act.desc}</div>
                  <span className={`${styles.actTag} ${styles[TAG_CLASS[act.tag]]}`}>{act.tagLabel}</span>
                  {act.id === 'fortune-realm' && <div className={styles.actCountdown}>剩余 {realmCountdown}</div>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── 在线领奖 ── */}
        {mainTab === 'rewards' && (
          loadingRewards ? <div className={styles.empty}><p>加载中...</p></div> : (
            <>
              {/* 签到区域 */}
              <div style={{
                background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)',
                borderRadius: 10, padding: 14, marginBottom: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-main)', fontSize: 15, color: 'var(--gold)' }}>每日签到</div>
                    {checkin && (
                      <div style={{ fontSize: 11, color: 'var(--ink)', opacity: 0.5, fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                        已连续签到 {checkin.consecutiveDays} 天 · 累计 {checkin.totalDays} 天
                      </div>
                    )}
                  </div>
                  <button
                    disabled={checkin?.todayChecked}
                    onClick={handleCheckin}
                    style={{
                      padding: '8px 16px',
                      background: checkin?.todayChecked ? 'none' : 'rgba(201,168,76,0.2)',
                      border: `1px solid ${checkin?.todayChecked ? 'var(--paper-darker)' : 'var(--gold)'}`,
                      borderRadius: 6, fontSize: 13,
                      color: checkin?.todayChecked ? 'var(--ink)' : 'var(--gold)',
                      opacity: checkin?.todayChecked ? 0.45 : 1,
                      cursor: checkin?.todayChecked ? 'default' : 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {checkin?.todayChecked ? '已签到' : '签到'}
                  </button>
                </div>
              </div>

              {/* 在线时长奖励 */}
              <div style={{ fontSize: 12, color: 'var(--ink)', opacity: 0.45, fontFamily: 'var(--font-ui)', marginBottom: 8 }}>
                今日在线 {onlineMinutes} 分钟 · 在线领奖
              </div>
              {onlineRewards.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.placeholderIcon}>🎁</span>
                  <p>在线奖励即将开放</p>
                </div>
              ) : (
                onlineRewards.map(r => (
                  <div
                    key={r.rewardId}
                    style={{
                      background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)',
                      borderRadius: 10, padding: '12px', marginBottom: 8,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink)', opacity: 0.4, fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                        {r.rewardDesc} · 需在线{r.requiredMinutes}分钟
                      </div>
                    </div>
                    <button
                      disabled={r.claimed || !r.available || claimingId === r.rewardId}
                      onClick={() => handleClaimOnline(r.rewardId)}
                      style={{
                        padding: '7px 14px',
                        background: r.claimed ? 'none' : r.available ? 'rgba(201,168,76,0.15)' : 'none',
                        border: `1px solid ${r.claimed ? 'var(--paper-darker)' : r.available ? 'rgba(201,168,76,0.35)' : 'var(--paper-darker)'}`,
                        borderRadius: 6, fontSize: 12,
                        color: r.claimed ? 'var(--ink)' : r.available ? 'var(--gold-dim)' : 'var(--ink)',
                        opacity: r.claimed || !r.available ? 0.4 : 1,
                        cursor: r.claimed || !r.available ? 'default' : 'pointer',
                        fontFamily: 'var(--font-ui)', flexShrink: 0, marginLeft: 8,
                      }}
                    >
                      {r.claimed ? '已领取' : r.available ? (claimingId === r.rewardId ? '...' : '领取') : '未达成'}
                    </button>
                  </div>
                ))
              )}
            </>
          )
        )}

        {/* ── 排行榜 ── */}
        {mainTab === 'ranking' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {RANK_TYPES.map(rt => (
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
              <div style={{
                padding: '8px 12px', background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, marginBottom: 10,
                fontSize: 12, color: 'var(--gold-dim)', fontFamily: 'var(--font-ui)',
              }}>
                我的排名：第 {myRank} 名
              </div>
            )}
            {loadingRank ? (
              <div className={styles.empty}><p>加载中...</p></div>
            ) : rankEntries.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.placeholderIcon}>🏆</span>
                <p>暂无排行数据</p>
              </div>
            ) : (
              rankEntries.map((e, idx) => (
                <div
                  key={e.playerId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', marginBottom: 6,
                    background: idx < 3 ? 'rgba(201,168,76,0.06)' : 'var(--paper-dark)',
                    border: `1px solid ${idx < 3 ? 'rgba(201,168,76,0.2)' : 'var(--paper-darker)'}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: idx === 0 ? '#c9a84c' : idx === 1 ? '#9e9e9e' : idx === 2 ? '#a0522d' : 'var(--paper-darker)',
                    fontSize: idx < 3 ? 12 : 11, fontWeight: 600,
                    color: idx < 3 ? '#1a1208' : 'var(--ink)',
                  }}>
                    {idx < 3 ? ['🥇','🥈','🥉'][idx] : e.rank}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{e.playerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink)', opacity: 0.4, fontFamily: 'var(--font-ui)' }}>
                      Lv.{e.level}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
                    {e.value.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
