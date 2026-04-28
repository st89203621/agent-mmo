import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchQuests,
  fetchAvailableQuests,
  acceptQuest,
  abandonQuest,
  type QuestData,
} from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import { Bar } from '../common/fusion';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';
import EmptyState from '../common/EmptyState';

type QuestTab = 'main' | 'active' | 'scroll' | 'achievement';

const TABS: { key: QuestTab; label: string }[] = [
  { key: 'main', label: '主线' },
  { key: 'active', label: '活跃' },
  { key: 'scroll', label: '卷轴' },
  { key: 'achievement', label: '成就' },
];

const TYPE_LABEL: Record<number, string> = {
  0: '主线', 1: '师门', 2: '区域', 3: '副本', 4: '卷轴', 5: '材料', 6: '隐藏',
};

const TYPE_ICON: Record<number, string> = {
  0: '团', 1: '师', 2: '域', 3: '窟', 4: '轴', 5: '材', 6: '秘',
};

const STATUS_AVAILABLE = 0;
const STATUS_ACCEPTED = 1;
const STATUS_COMPLETED = 2;
const STATUS_CLAIMED = 3;

function classifyTab(type: number): QuestTab {
  if (type === 0) return 'main';
  if (type === 4) return 'scroll';
  return 'active';
}

function questNavTarget(type: number): 'battle' | 'dungeon' | 'hunt' | 'scene' {
  if (type === 3) return 'dungeon';
  if (type === 2) return 'hunt';
  if (type === 4) return 'scene';
  return 'battle';
}

export default function QuestPage() {
  usePageBackground(PAGE_BG.QUEST);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [tab, setTab] = useState<QuestTab>('main');
  const [myQuests, setMyQuests] = useState<QuestData[]>([]);
  const [available, setAvailable] = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, avail] = await Promise.all([
        fetchQuests().catch(() => ({ quests: [] as QuestData[] })),
        fetchAvailableQuests().catch(() => ({ quests: [] as QuestData[] })),
      ]);
      setMyQuests(mine.quests || []);
      setAvailable(avail.quests || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAccept = useCallback(async (quest: QuestData) => {
    setOperating(quest.questId);
    try {
      await acceptQuest(quest.questId);
      toast.success('任务已接取');
      await loadData();
    } catch {
      toast.error('接取失败');
    }
    setOperating(null);
  }, [loadData]);

  const handleAbandon = useCallback(async (quest: QuestData) => {
    setOperating(quest.questId);
    try {
      await abandonQuest(quest.questId);
      toast.success('已放弃任务');
      await loadData();
    } catch {
      toast.error('放弃失败');
    }
    setOperating(null);
  }, [loadData]);

  const allQuests = useMemo(() => {
    const byId = new Map<string, QuestData>();
    myQuests.forEach((q) => byId.set(q.questId, q));
    available.forEach((q) => { if (!byId.has(q.questId)) byId.set(q.questId, q); });
    return Array.from(byId.values());
  }, [myQuests, available]);

  const groupedCount = useMemo(() => {
    const counts: Record<QuestTab, number> = { main: 0, active: 0, scroll: 0, achievement: 0 };
    allQuests.forEach((q) => {
      if (q.status === STATUS_CLAIMED || q.status === 4) return;
      counts[classifyTab(q.type)]++;
    });
    return counts;
  }, [allQuests]);

  const daily = useMemo(() => {
    const total = allQuests.filter((q) => q.type !== 0 && q.status !== 4).length;
    const done = allQuests.filter((q) => (q.status === STATUS_COMPLETED || q.status === STATUS_CLAIMED) && q.type !== 0).length;
    const percent = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
    return { total, done, percent };
  }, [allQuests]);

  const filtered = useMemo(() => {
    if (tab === 'achievement') {
      return allQuests.filter((q) => q.status === STATUS_CLAIMED);
    }
    return allQuests.filter((q) => q.status !== STATUS_CLAIMED && classifyTab(q.type) === tab);
  }, [allQuests, tab]);

  const renderCard = (quest: QuestData) => {
    const isMain = quest.type === 0;
    const isDone = quest.status === STATUS_COMPLETED || quest.status === STATUS_CLAIMED;
    const cardCls = [styles.qsCard, isMain ? styles.qsCardMain : '', isDone ? styles.qsCardDone : '']
      .filter(Boolean).join(' ');
    const isOperating = operating === quest.questId;

    let action: { label: string; onClick: () => void; variant?: 'done' | 'gold' } | null = null;
    if (quest.status === STATUS_AVAILABLE) {
      action = { label: isOperating ? '...' : '接取', onClick: () => handleAccept(quest), variant: 'gold' };
    } else if (quest.status === STATUS_ACCEPTED) {
      action = quest.progress >= quest.target
        ? { label: '领奖', onClick: () => toast.info('完成后请到对应场景领奖'), variant: 'gold' }
        : { label: '前往', onClick: () => navigateTo(questNavTarget(quest.type)) };
    } else if (quest.status === STATUS_COMPLETED) {
      action = { label: '领奖', onClick: () => toast.info('等待服务端结算'), variant: 'gold' };
    } else if (quest.status === STATUS_CLAIMED) {
      action = { label: '已领', onClick: () => {}, variant: 'done' };
    }

    const showBar = quest.status === STATUS_ACCEPTED && quest.target > 0;
    const goCls = [
      styles.qsGo,
      action?.variant === 'done' ? styles.qsGoDone : '',
      action?.variant === 'gold' ? styles.qsGoGold : '',
    ].filter(Boolean).join(' ');

    return (
      <div key={quest.questId} className={cardCls}>
        <div className={styles.qsIc}>{TYPE_ICON[quest.type] ?? '任'}</div>
        <div className={styles.qsBody}>
          <div className={styles.qsBodyTitle}>
            <span className={styles.qsNm}>{quest.name}</span>
            <span className={`${styles.qsTg} ${!isMain ? styles.qsTgGold : ''}`.trim()}>
              {TYPE_LABEL[quest.type] ?? '任务'}
            </span>
          </div>
          {quest.description && <div className={styles.qsDs}>{quest.description}</div>}
          {showBar ? (
            <div className={styles.qsPr}>
              <span className={styles.qsPrV}>{quest.progress} / {quest.target}</span>
              <Bar kind="gold" current={quest.progress} max={quest.target} />
            </div>
          ) : (
            <div className={styles.qsPr}>
              {isDone ? (
                <span className={`${styles.qsPrV} ${styles.qsPrVJade}`}>已完成</span>
              ) : quest.status === STATUS_AVAILABLE ? (
                <span className={styles.qsPrV}>可接取 · Lv {quest.level}</span>
              ) : null}
            </div>
          )}
          {quest.rewards && <div className={styles.qsRw}>奖励 {quest.rewards}</div>}
          {quest.status === STATUS_ACCEPTED && (
            <div className={styles.qsPr}>
              <button
                className={styles.qsPrV}
                style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                onClick={() => handleAbandon(quest)}
                disabled={isOperating}
                type="button"
              >
                放弃
              </button>
            </div>
          )}
        </div>
        {action && (
          <button className={goCls} onClick={action.onClick} disabled={isOperating} type="button">
            {action.label}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`${styles.mockPage} ${styles.dim}`}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>任 务</span>
            <span className={styles.appbarZone}>今日 {daily.done} / {daily.total}</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('codex')} type="button">史</button>
            <button className={`${styles.appbarIcon} ${styles.appbarIconDot}`} onClick={() => navigateTo('mail')} type="button">奖</button>
          </div>
        </div>
      </div>

      <div className={styles.qsTabs}>
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`${styles.qsTab} ${tab === item.key ? styles.qsTabOn : ''}`.trim()}
            onClick={() => setTab(item.key)}
            type="button"
          >
            {item.label}
            {groupedCount[item.key] > 0 && (
              <span className={styles.qsTabCnt}>{groupedCount[item.key]}</span>
            )}
          </button>
        ))}
      </div>

      {daily.total > 0 && (
        <div className={styles.qsDaily}>
          <div style={{ flex: 1 }}>
            <div className={styles.qsDailyLabel}>今日任务完成度</div>
            <div className={styles.qsDailyVal}>{daily.done} / {daily.total} · {daily.percent}%</div>
            <Bar kind="gold" current={daily.done} max={daily.total} />
          </div>
          <button
            className={styles.qsFast}
            onClick={() => toast.info('快进功能待开放')}
            type="button"
          >
            快进全部
            <span className={styles.qsFastCost}>20 玩币</span>
          </button>
        </div>
      )}

      <div className={styles.qsList}>
        {loading ? (
          <EmptyState icon="◷" title="任务载入中" hint="正在调阅功过簿…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="✦"
            title="尚无任务"
            hint={
              <>
                {tab === 'achievement'
                  ? '尚未达成此类成就，去江湖中走一遭吧。'
                  : tab === 'main'
                  ? '主线任务暂歇，去主城与 NPC 攀谈，新缘起或在前方。'
                  : '此分类暂无委托。'}
              </>
            }
            action={
              tab !== 'achievement' ? (
                <button
                  onClick={() => navigateTo('scene')}
                  type="button"
                  style={{
                    padding: '10px 24px',
                    borderRadius: 4,
                    border: '1px solid var(--gold)',
                    color: 'var(--gold)',
                    background: 'transparent',
                    fontFamily: 'var(--font-serif)',
                    fontSize: 14,
                    letterSpacing: 3,
                    cursor: 'pointer',
                  }}
                >
                  去 主 城 走 走
                </button>
              ) : undefined
            }
          />
        ) : (
          filtered.map(renderCard)
        )}
      </div>
    </div>
  );
}
