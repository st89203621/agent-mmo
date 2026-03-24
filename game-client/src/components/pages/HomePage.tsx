import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import {
  fetchPersonInfo, fetchExploreStatus, fetchQuests, fetchRebirthStatus,
  fetchRelations, fetchCheckinStatus, doCheckin,
  type PersonData, type QuestData,
} from '../../services/api';
import type { ExploreStatus, Relation } from '../../types';
import styles from './HomePage.module.css';

const CHECKIN_REWARDS = [
  { day: 1, reward: '金币×100', icon: '🪙' },
  { day: 2, reward: '附魔符×1', icon: '✦' },
  { day: 3, reward: '金币×200', icon: '🪙' },
  { day: 4, reward: '宠物蛋×1', icon: '🥚' },
  { day: 5, reward: '金币×300', icon: '🪙' },
  { day: 6, reward: '钻石×10', icon: '💎' },
  { day: 7, reward: '传说宝箱', icon: '📦' },
];

interface HomeData {
  person: PersonData | null;
  explore: ExploreStatus | null;
  quests: QuestData[];
  rebirthInfo: { currentWorldIndex: number; currentBook: string; totalRebirths: number } | null;
  relations: Relation[];
  checkin: { todayChecked: boolean; consecutiveDays: number; totalDays: number } | null;
}

export default function HomePage() {
  const { navigateTo, currentBookWorld } = useGameStore();
  const { playerName, gold, diamond } = usePlayerStore();
  const [data, setData] = useState<HomeData>({
    person: null, explore: null, quests: [], rebirthInfo: null, relations: [], checkin: null,
  });
  const [loading, setLoading] = useState(true);
  const [checkinAnimating, setCheckinAnimating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchPersonInfo().catch(() => null),
      fetchExploreStatus().catch(() => null),
      fetchQuests().catch(() => ({ quests: [] })),
      fetchRebirthStatus().catch(() => null),
      fetchRelations().catch(() => ({ relations: [] })),
      fetchCheckinStatus().catch(() => null),
    ]).then(([person, explore, questRes, rebirth, relRes, checkin]) => {
      setData({
        person: person as PersonData | null,
        explore: explore as ExploreStatus | null,
        quests: (questRes as { quests: QuestData[] })?.quests || [],
        rebirthInfo: rebirth as HomeData['rebirthInfo'],
        relations: (relRes as { relations: Relation[] })?.relations || [],
        checkin: checkin as HomeData['checkin'],
      });
      setLoading(false);
    });
  }, []);

  const handleCheckin = useCallback(async () => {
    if (data.checkin?.todayChecked || checkinAnimating) return;
    setCheckinAnimating(true);
    try {
      const res = await doCheckin();
      setData((prev) => ({ ...prev, checkin: res }));
      const dayReward = CHECKIN_REWARDS[(res.consecutiveDays - 1) % 7];
      toast.reward(`签到成功！获得 ${dayReward.reward}`);
    } catch {
      toast.error('签到失败');
    }
    setTimeout(() => setCheckinAnimating(false), 600);
  }, [data.checkin, checkinAnimating]);

  const activeQuests = data.quests.filter((q) => q.status === 1);
  const topRelations = [...data.relations].sort((a, b) => b.fateScore - a.fateScore).slice(0, 3);
  const hasBook = !!currentBookWorld;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCenter}>七世轮回书</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.scrollArea}>
        {/* 角色概览卡 */}
        <section className={styles.heroCard} onClick={() => navigateTo('character')}>
          <div className={styles.heroAvatar}>
            {data.person?.name?.charAt(0) || '侠'}
          </div>
          <div className={styles.heroInfo}>
            <h2 className={styles.heroName}>{data.person?.name || playerName || '无名侠客'}</h2>
            <p className={styles.heroMeta}>
              第{(data.rebirthInfo?.currentWorldIndex || 0) + 1}世
              {data.rebirthInfo?.currentBook && ` · ${data.rebirthInfo.currentBook}`}
            </p>
            <div className={styles.currencyRow}>
              <span className={styles.currencyItem}>
                <span className={styles.currencyIcon}>金</span>{gold}
              </span>
              <span className={styles.currencyItem}>
                <span className={styles.currencyIconDiamond}>钻</span>{diamond}
              </span>
            </div>
          </div>
          <span className={styles.heroArrow}>&rsaquo;</span>
        </section>

        {/* 每日签到 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>每日签到</h3>
            {data.checkin && (
              <span className={styles.sectionBadge}>连续{data.checkin.consecutiveDays}天</span>
            )}
          </div>
          <div className={styles.checkinRow}>
            {CHECKIN_REWARDS.map((r, i) => {
              const day = i + 1;
              const checked = data.checkin ? data.checkin.consecutiveDays >= day && data.checkin.todayChecked
                ? true : data.checkin.consecutiveDays > i : false;
              const isToday = data.checkin
                ? (!data.checkin.todayChecked && data.checkin.consecutiveDays === i)
                  || (data.checkin.todayChecked && data.checkin.consecutiveDays === day)
                : i === 0;
              return (
                <button
                  key={day}
                  className={`${styles.checkinDay} ${checked ? styles.checkinDone : ''} ${isToday && !checked ? styles.checkinToday : ''}`}
                  onClick={isToday && !checked ? handleCheckin : undefined}
                  disabled={checked || (isToday ? checkinAnimating : true)}
                >
                  <span className={styles.checkinIcon}>{checked ? '✓' : r.icon}</span>
                  <span className={styles.checkinLabel}>Day{day}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 今日推荐 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>今日推荐</h3>
          <div className={styles.actionGrid}>
            {!hasBook && (
              <button className={`${styles.actionCard} ${styles.actionHighlight}`} onClick={() => navigateTo('book-world')}>
                <span className={styles.actionIcon}>📚</span>
                <span className={styles.actionText}>选择书籍</span>
                <span className={styles.actionHint}>开启你的世界</span>
              </button>
            )}
            <button className={styles.actionCard} onClick={() => navigateTo('story')}>
              <span className={styles.actionIcon}>📜</span>
              <span className={styles.actionText}>续写故事</span>
              <span className={styles.actionHint}>与NPC对话</span>
            </button>
            <button className={styles.actionCard} onClick={() => navigateTo('explore')}>
              <span className={styles.actionIcon}>🗺️</span>
              <span className={styles.actionText}>书中探索</span>
              <span className={styles.actionHint}>
                {data.explore ? `${data.explore.actionPoints}/${data.explore.maxPoints} 行动力` : '发现奇遇'}
              </span>
            </button>
            <button className={styles.actionCard} onClick={() => navigateTo('dungeon')}>
              <span className={styles.actionIcon}>⚔️</span>
              <span className={styles.actionText}>副本挑战</span>
              <span className={styles.actionHint}>战斗获取装备</span>
            </button>
            <button className={styles.actionCard} onClick={() => navigateTo('quest')}>
              <span className={styles.actionIcon}>📋</span>
              <span className={styles.actionText}>任务</span>
              <span className={styles.actionHint}>{activeQuests.length > 0 ? `${activeQuests.length}个进行中` : '接取任务'}</span>
            </button>
          </div>
        </section>

        {/* 进行中的任务 */}
        {activeQuests.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>进行中</h3>
              <button className={styles.moreBtn} onClick={() => navigateTo('quest')}>更多</button>
            </div>
            <div className={styles.questList}>
              {activeQuests.slice(0, 3).map((q) => (
                <div key={q.questId} className={styles.questItem} onClick={() => navigateTo('quest')}>
                  <div className={styles.questInfo}>
                    <span className={styles.questName}>{q.name}</span>
                    <span className={styles.questProgress}>
                      {q.target > 0 ? `${q.progress}/${q.target}` : '进行中'}
                    </span>
                  </div>
                  {q.target > 0 && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 缘分概览 */}
        {topRelations.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>缘分最深</h3>
              <button className={styles.moreBtn} onClick={() => navigateTo('achievement')}>全部</button>
            </div>
            <div className={styles.fateList}>
              {topRelations.map((r) => (
                <div key={r.npcId} className={styles.fateItem}>
                  <div className={styles.fateAvatar}>
                    {r.npcName.charAt(0)}
                  </div>
                  <div className={styles.fateInfo}>
                    <span className={styles.fateName}>{r.npcName}</span>
                    <div className={styles.fateBars}>
                      <div className={styles.fateBarTrack}>
                        <div className={styles.fateBarFill} style={{ width: `${r.fateScore}%`, background: 'var(--gold)' }} />
                      </div>
                      <span className={styles.fateScore}>{r.fateScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 快捷入口 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>更多</h3>
          <div className={styles.quickGrid}>
            {[
              { id: 'skill-tree' as const, label: '技能树', icon: '🌳' },
              { id: 'pet' as const, label: '宠物', icon: '🐾' },
              { id: 'enchant' as const, label: '附魔', icon: '✦' },
              { id: 'shop' as const, label: '商城', icon: '🏪' },
              { id: 'companion' as const, label: '灵侣', icon: '💞' },
              { id: 'codex' as const, label: '图鉴', icon: '📖' },
              { id: 'memory' as const, label: '记忆', icon: '🌙' },
              { id: 'rebirth' as const, label: '轮回', icon: '♻️' },
            ].map((item) => (
              <button key={item.id} className={styles.quickItem} onClick={() => navigateTo(item.id)}>
                <span className={styles.quickIcon}>{item.icon}</span>
                <span className={styles.quickLabel}>{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
