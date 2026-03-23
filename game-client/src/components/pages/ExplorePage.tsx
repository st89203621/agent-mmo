import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { fetchExploreStatus, exploreAction, resolveExploreChoice, fetchExploreHistory } from '../../services/api';
import type { ExploreStatus, ExploreEvent, ExploreReward } from '../../types';
import styles from './ExplorePage.module.css';

const EVENT_ICONS: Record<string, string> = {
  encounter: '\u{1F464}',
  discovery: '\u{1F48E}',
  lore:      '\u{1F4DC}',
  dilemma:   '\u{1F500}',
  vista:     '\u{26F0}\uFE0F',
};

const EVENT_LABELS: Record<string, string> = {
  encounter: '奇遇',
  discovery: '拾遗',
  lore:      '秘闻',
  dilemma:   '抉择',
  vista:     '奇景',
};

const RISK_LABELS: Record<string, string> = {
  low: '稳',
  medium: '险',
  high: '危',
};

interface ResolvedEvent {
  event: ExploreEvent;
  reward: ExploreReward;
}

export default function ExplorePage() {
  const { currentBookWorld } = useGameStore();
  const { currentWorldIndex } = usePlayerStore();

  const [status, setStatus] = useState<ExploreStatus | null>(null);
  const [currentEvent, setCurrentEvent] = useState<ExploreEvent | null>(null);
  const [currentReward, setCurrentReward] = useState<ExploreReward | null>(null);
  const [history, setHistory] = useState<ResolvedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exploring, setExploring] = useState(false);
  const [resolving, setResolving] = useState(false);
  const recoverTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [recoverCountdown, setRecoverCountdown] = useState(0);

  const bookTitle = currentBookWorld?.title || '未知世界';

  // 加载状态和历史
  const loadData = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([fetchExploreStatus(), fetchExploreHistory()]);
      setStatus(s);
      setRecoverCountdown(s.nextRecoverSec);
      // 将历史事件转为 ResolvedEvent（没有 reward 信息，简单展示）
      setHistory(h.events.map(e => ({
        event: e,
        reward: { message: '', fateDelta: 0, trustDelta: 0, itemName: null, memoryTitle: null, imageUrl: null },
      })));
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 恢复倒计时
  useEffect(() => {
    if (recoverTimerRef.current) clearInterval(recoverTimerRef.current);
    if (status && status.actionPoints < status.maxPoints && recoverCountdown > 0) {
      recoverTimerRef.current = setInterval(() => {
        setRecoverCountdown(prev => {
          if (prev <= 1) {
            // 刷新状态
            fetchExploreStatus().then(s => {
              setStatus(s);
              setRecoverCountdown(s.nextRecoverSec);
            }).catch(() => {});
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (recoverTimerRef.current) clearInterval(recoverTimerRef.current); };
  }, [status, recoverCountdown]);

  // 探索
  const handleExplore = useCallback(async () => {
    if (exploring || !status || status.actionPoints <= 0) return;
    setExploring(true);
    setCurrentReward(null);
    try {
      const { event } = await exploreAction(currentWorldIndex, bookTitle);
      setCurrentEvent(event);
      // 刷新状态
      const s = await fetchExploreStatus();
      setStatus(s);
      setRecoverCountdown(s.nextRecoverSec);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '探索失败');
    } finally {
      setExploring(false);
    }
  }, [exploring, status, currentWorldIndex, bookTitle]);

  // 选择
  const handleChoice = useCallback(async (choiceId: number) => {
    if (resolving || !currentEvent) return;
    setResolving(true);
    try {
      const reward = await resolveExploreChoice(currentEvent.eventId, choiceId);
      setCurrentReward(reward);
      // 添加到历史
      setHistory(prev => [{ event: currentEvent, reward }, ...prev]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setResolving(false);
    }
  }, [resolving, currentEvent]);

  // 关闭奖励，准备下一次
  const handleDismissReward = useCallback(() => {
    setCurrentEvent(null);
    setCurrentReward(null);
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>进入书中世界...</div>
      </div>
    );
  }

  const ap = status?.actionPoints ?? 0;
  const maxAp = status?.maxPoints ?? 10;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.page}>
      {/* 顶栏 */}
      <div className={styles.topBar}>
        <span className={styles.sceneName}>{bookTitle} · 书中漫步</span>
        <span className={styles.todayCount}>今日探索 {status?.todayCount ?? 0} 次</span>
      </div>

      {/* 行动力 */}
      <div className={styles.actionBar}>
        <span className={styles.actionLabel}>行动力</span>
        <div className={styles.actionDots}>
          {Array.from({ length: maxAp }, (_, i) => (
            <div key={i} className={`${styles.dot} ${i < ap ? styles.dotFilled : ''}`} />
          ))}
        </div>
        <span className={styles.actionText}>{ap}/{maxAp}</span>
      </div>
      {ap < maxAp && recoverCountdown > 0 && (
        <div className={styles.recoverHint}>下一点恢复：{formatTime(recoverCountdown)}</div>
      )}

      {/* 事件区域 */}
      <div className={styles.eventArea}>
        {/* 当前事件 */}
        {currentEvent && !currentReward && (
          <div className={styles.eventCard}>
            <div className={styles.cardHeader}>
              <span className={styles.eventIcon} data-type={currentEvent.type}>
                {EVENT_ICONS[currentEvent.type] || '?'}
              </span>
              <span className={styles.eventType} data-type={currentEvent.type}>
                {EVENT_LABELS[currentEvent.type] || currentEvent.type}
              </span>
              <span className={styles.eventTitle}>{currentEvent.title}</span>
            </div>
            <div className={styles.eventDesc}>{currentEvent.description}</div>
            <div className={styles.choicesRow}>
              {currentEvent.choices.map(c => (
                <button
                  key={c.id}
                  className={styles.choiceBtn}
                  data-risk={c.risk}
                  disabled={resolving}
                  onClick={() => handleChoice(c.id)}
                >
                  {c.risk !== 'low' && (
                    <span className={styles.riskTag} data-risk={c.risk}>
                      {RISK_LABELS[c.risk] || c.risk}
                    </span>
                  )}
                  {c.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 奖励展示 */}
        {currentReward && (
          <div className={styles.eventCard} onClick={handleDismissReward} style={{ cursor: 'pointer' }}>
            <div className={styles.rewardPopup}>
              <div className={styles.rewardMessage}>{currentReward.message}</div>
              {currentReward.itemName && (
                <div className={styles.rewardDetail}>获得物品：{currentReward.itemName}</div>
              )}
              {currentReward.memoryTitle && (
                <div className={styles.rewardDetail}>获得记忆：{currentReward.memoryTitle}</div>
              )}
              <div className={styles.rewardDetail} style={{ marginTop: 8, opacity: 0.6 }}>
                点击继续
              </div>
            </div>
          </div>
        )}

        {/* 生成中 */}
        {exploring && (
          <div className={styles.generating}>翻开书页，命运正在织就...</div>
        )}

        {/* 空状态提示 */}
        {!currentEvent && !currentReward && !exploring && history.length === 0 && (
          <div className={styles.emptyHint}>
            踏入书页，开启你的书中漫步之旅<br />
            每一次探索都是一段未知的故事
          </div>
        )}

        {/* 历史事件 */}
        {history.length > 0 && !currentEvent && !currentReward && (
          <div className={styles.historySection}>
            <div className={styles.historyTitle}>漫步日志</div>
            {history.map((item, i) => (
              <div key={item.event.eventId + i} className={styles.historyCard} data-type={item.event.type}>
                <span className={styles.historyIcon}>{EVENT_ICONS[item.event.type] || '?'}</span>
                <div className={styles.historyInfo}>
                  <div className={styles.historyName}>
                    {EVENT_LABELS[item.event.type]} · {item.event.title}
                  </div>
                </div>
                {item.reward.message && (
                  <span className={styles.historyReward}>{item.reward.message}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部探索按钮 */}
      <div className={styles.bottomBar}>
        <button
          className={styles.exploreBtn}
          disabled={ap <= 0 || exploring || (!!currentEvent && !currentReward)}
          onClick={handleExplore}
        >
          {ap <= 0 ? '行动力不足' : exploring ? '命运织就中...' : '踏入书页'}
        </button>
      </div>
    </div>
  );
}
