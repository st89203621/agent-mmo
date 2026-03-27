import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchExploreStatus, exploreAction, resolveExploreChoice, fetchExploreHistory,
  startExploreCombat, resolveExploreCombat,
  fetchPlayerCurrency, fetchRelations, generateSceneImage,
} from '../../services/api';
import type { ExploreStatus, ExploreEvent, ExploreReward } from '../../types';
import styles from './ExplorePage.module.css';

const EVENT_ICONS: Record<string, string> = {
  encounter: '\u{1F464}',
  discovery: '\u{1F48E}',
  lore:      '\u{1F4DC}',
  dilemma:   '\u{1F500}',
  vista:     '\u{26F0}\uFE0F',
  combat:    '\u{2694}\uFE0F',
  deja_vu:   '\u{1F300}',
};

const EVENT_LABELS: Record<string, string> = {
  encounter: '奇遇',
  discovery: '拾遗',
  lore:      '秘闻',
  dilemma:   '抉择',
  vista:     '奇景',
  combat:    '遭遇战',
  deja_vu:   '前世回响',
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
  const { currentBookWorld, navigateTo } = useGameStore();
  const { currentWorldIndex } = usePlayerStore();

  const [status, setStatus] = useState<ExploreStatus | null>(null);
  const [currentEvent, setCurrentEvent] = useState<ExploreEvent | null>(null);
  const [currentReward, setCurrentReward] = useState<ExploreReward | null>(null);
  const [history, setHistory] = useState<ResolvedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exploring, setExploring] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [battleLoading, setBattleLoading] = useState(false);
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const recoverTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [recoverCountdown, setRecoverCountdown] = useState(0);
  const mapScrollRef = useRef<HTMLDivElement>(null);

  const bookTitle = currentBookWorld?.title || '';

  // 背景图：按书缓存到 localStorage
  const [bgLoading, setBgLoading] = useState(false);
  const bgLoadingRef = useRef(false);

  const generateBg = useCallback((force = false) => {
    if (!bookTitle || bgLoadingRef.current) return;
    const cacheKey = `explore_bg_${currentWorldIndex}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setBgUrl(cached); return; }
    }
    bgLoadingRef.current = true;
    setBgLoading(true);
    setBgUrl(null);
    const uid = force ? `explore_bg_${Date.now()}` : 'explore_bg';
    generateSceneImage(uid, currentWorldIndex, '唯美风景插画', `${bookTitle}的纯风景全景，无人物，清新唯美，远山云海花田溪流，柔和光影，空灵意境`)
      .then(res => { localStorage.setItem(cacheKey, res.imageUrl); setBgUrl(res.imageUrl); })
      .catch(() => {})
      .finally(() => { bgLoadingRef.current = false; setBgLoading(false); });
  }, [bookTitle, currentWorldIndex]);

  useEffect(() => { generateBg(); }, [generateBg]);

  // 未选书引导
  if (!currentBookWorld) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyGuide}>
          <div className={styles.emptyIcon}>🗺️</div>
          <p className={styles.emptyText}>尚未踏入任何书中世界</p>
          <p className={styles.emptySubtext}>选择一部书籍，开启你的探索之旅</p>
          <button className={styles.guideBtn} onClick={() => navigateTo('story')}>
            前往选书
          </button>
        </div>
      </div>
    );
  }

  const loadData = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([fetchExploreStatus(), fetchExploreHistory()]);
      setStatus(s);
      setRecoverCountdown(s.nextRecoverSec);
      setHistory(h.events.map(e => ({
        event: e,
        reward: {
          message: e.rewardMessage || '',
          fateDelta: e.rewardFateDelta || 0,
          trustDelta: e.rewardTrustDelta || 0,
          itemName: e.rewardItemName || null,
          memoryTitle: e.rewardMemoryTitle || null,
          imageUrl: null,
        },
      })));
    } catch { /* 静默 */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 滚动到底部（当前位置）
  useEffect(() => {
    if (!loading && mapScrollRef.current) {
      mapScrollRef.current.scrollTop = mapScrollRef.current.scrollHeight;
    }
  }, [loading, history.length]);

  const syncAfterReward = useCallback(async () => {
    try {
      const [cur, rel] = await Promise.all([
        fetchPlayerCurrency().catch(() => null),
        fetchRelations().catch(() => null),
      ]);
      if (cur) usePlayerStore.getState().setCurrency(cur.gold, cur.diamond);
      if (rel) usePlayerStore.getState().setRelations(rel.relations);
    } catch { /* 静默 */ }
  }, []);

  // 恢复倒计时
  useEffect(() => {
    if (recoverTimerRef.current) clearInterval(recoverTimerRef.current);
    if (status && status.actionPoints < status.maxPoints && recoverCountdown > 0) {
      recoverTimerRef.current = setInterval(() => {
        setRecoverCountdown(prev => {
          if (prev <= 1) {
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

  const handleExplore = useCallback(async () => {
    if (exploring || !status || status.actionPoints <= 0) return;
    setExploring(true);
    setCurrentReward(null);
    setEventImageUrl(null);
    try {
      const { event } = await exploreAction(currentWorldIndex, bookTitle);
      setCurrentEvent(event);
      // 为有视觉内容的事件生成场景图
      const hint = event.sceneHint
        || (event.type === 'encounter' && event.npcId ? `偶遇${event.title}` : null)
        || (event.type === 'combat' && event.enemyName ? `遭遇${event.enemyName}` : null);
      if (hint) {
        generateSceneImage(event.npcId || 'scene', currentWorldIndex, undefined, hint)
          .then(res => setEventImageUrl(res.imageUrl))
          .catch(() => {});
      }
      const s = await fetchExploreStatus();
      setStatus(s);
      setRecoverCountdown(s.nextRecoverSec);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '探索失败');
    } finally {
      setExploring(false);
    }
  }, [exploring, status, currentWorldIndex, bookTitle]);

  const handleChoice = useCallback(async (choiceId: number) => {
    if (resolving || !currentEvent) return;

    if (currentEvent.type === 'combat' && choiceId === 0) {
      setBattleLoading(true);
      try {
        await startExploreCombat(currentEvent.eventId, currentEvent.enemyName || '妖兽');
        navigateTo('battle', { exploreEventId: currentEvent.eventId });
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : '战斗发起失败');
      } finally {
        setBattleLoading(false);
      }
      return;
    }

    setResolving(true);
    try {
      const reward = await resolveExploreChoice(currentEvent.eventId, choiceId);
      setCurrentReward(reward);
      setHistory(prev => [{ event: currentEvent, reward }, ...prev]);
      syncAfterReward();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setResolving(false);
    }
  }, [resolving, currentEvent, navigateTo, syncAfterReward]);

  // 战斗返回结算
  const pendingResolveRef = useRef<string | null>(null);
  useEffect(() => {
    const params = useGameStore.getState().pageParams;
    const resolvedEventId = params?.resolvedBattleEventId as string | undefined;
    if (resolvedEventId && resolvedEventId !== pendingResolveRef.current) {
      pendingResolveRef.current = resolvedEventId;
      resolveExploreCombat(resolvedEventId).then((reward) => {
        setCurrentReward(reward);
        setCurrentEvent(null);
        syncAfterReward();
      }).catch(() => {});
    }
  });

  const handleDismissReward = useCallback(() => {
    setCurrentEvent(null);
    setCurrentReward(null);
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.loadingOrb} />
          <span>步入书中世界...</span>
        </div>
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

  // 反转历史用于地图显示（最旧的在上，最新的在下）
  const mapEvents = [...history].reverse();

  return (
    <div className={styles.page}>
      {/* 大气层 */}
      <div className={styles.atmosphere}>
        {bgUrl && <div className={styles.bgImage} style={{ backgroundImage: `url(${bgUrl})` }} />}
        <div className={styles.mountains} />
        <div className={styles.fogTop} />
        <div className={styles.fogBottom} />
        <div className={styles.particles}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={styles.particle} data-kind="firefly" style={{ '--i': i } as React.CSSProperties} />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <span key={`p${i}`} className={styles.particle} data-kind="petal" style={{ '--i': i } as React.CSSProperties} />
          ))}
          {Array.from({ length: 2 }, (_, i) => (
            <span key={`d${i}`} className={styles.particle} data-kind="dust" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>
      </div>

      {/* 地图头部 */}
      <div className={styles.mapHeader}>
        <div className={styles.mapTitleRow}>
          <span className={styles.mapTitle}>{bookTitle}</span>
          <span className={styles.mapSubtitle}>书中漫步</span>
          <button
            className={styles.bgRefreshBtn}
            disabled={bgLoading}
            onClick={() => generateBg(true)}
            title="换背景"
          >
            {bgLoading ? '...' : '🎨'}
          </button>
        </div>
        <div className={styles.apRow}>
          <div className={styles.apDots}>
            {Array.from({ length: maxAp }, (_, i) => (
              <span key={i} className={`${styles.apDot} ${i < ap ? styles.apDotFilled : ''}`} />
            ))}
          </div>
          <span className={styles.apText}>{ap}/{maxAp}</span>
          {ap < maxAp && recoverCountdown > 0 && (
            <span className={styles.recoverText}>{formatTime(recoverCountdown)}</span>
          )}
        </div>
      </div>

      {/* 地图主体 */}
      <div className={styles.mapBody} ref={mapScrollRef}>
        <div className={styles.mapTrail}>
          {/* 起点 */}
          <div className={styles.trailOrigin}>
            <div className={styles.originDot} />
            <span className={styles.originLabel}>起点</span>
          </div>

          {/* 路径线 */}
          <div className={styles.pathLine} />

          {/* 历史节点 */}
          {mapEvents.map((item, i) => (
            <div
              key={item.event.eventId + i}
              className={styles.mapNode}
              data-type={item.event.type}
              style={{ '--n': i } as React.CSSProperties}
            >
              <div className={styles.nodeDot} data-type={item.event.type}>
                <span className={styles.nodeIcon}>{EVENT_ICONS[item.event.type] || '?'}</span>
              </div>
              <div className={styles.nodeCard}>
                <div className={styles.cardAccent} data-type={item.event.type} />
                <span className={styles.nodeType} data-type={item.event.type}>
                  {EVENT_LABELS[item.event.type] || item.event.type}
                </span>
                <span className={styles.nodeTitle}>{item.event.title}</span>
                {item.reward.message && (
                  <span className={styles.nodeReward}>{item.reward.message}</span>
                )}
              </div>
            </div>
          ))}

          {/* 当前位置标记 */}
          <div className={styles.currentPos}>
            <div className={styles.currentPulse} />
            <div className={styles.currentDot} />
            <span className={styles.currentLabel}>
              {exploring ? '命运织就中...' : currentEvent ? '事件进行中' : '当前位置'}
            </span>
          </div>

          {/* 未探索迷雾 */}
          <div className={styles.unexplored}>
            <div className={styles.mistLine} />
            <span className={styles.mistText}>未知领域</span>
          </div>
        </div>
      </div>

      {/* 事件浮层 — 当前事件卡片 */}
      {currentEvent && !currentReward && (
        <div className={styles.eventOverlay} data-type={currentEvent.type}>
          <div className={styles.eventCard}>
            <div className={styles.cardBadge} data-type={currentEvent.type}>
              <span>{EVENT_ICONS[currentEvent.type] || '?'}</span>
              <span>{EVENT_LABELS[currentEvent.type] || currentEvent.type}</span>
            </div>
            <h3 className={styles.cardTitle}>{currentEvent.title}</h3>
            {eventImageUrl && (
              <div className={styles.cardImage}>
                <img src={eventImageUrl} alt={currentEvent.title} />
              </div>
            )}
            <p className={styles.cardDesc}>{currentEvent.description}</p>

            {!battleLoading && (
              <div className={styles.cardChoices}>
                {currentEvent.choices.map(c => (
                  <button
                    key={c.id}
                    className={styles.choiceBtn}
                    data-risk={c.risk}
                    disabled={resolving}
                    onClick={() => handleChoice(c.id)}
                  >
                    <span className={styles.choiceText}>{c.text}</span>
                    {c.risk !== 'low' && (
                      <span className={styles.riskTag} data-risk={c.risk}>
                        {RISK_LABELS[c.risk] || c.risk}
                      </span>
                    )}
                  </button>
                ))}
                {currentEvent.type === 'encounter' && currentEvent.npcId && (
                  <button
                    className={`${styles.choiceBtn} ${styles.choiceTalk}`}
                    onClick={() => {
                      resolveExploreChoice(currentEvent.eventId, 0)
                        .then(() => { setCurrentReward(null); setCurrentEvent(null); syncAfterReward(); })
                        .catch(() => {});
                      navigateTo('story', { autoNpcId: currentEvent.npcId });
                    }}
                  >
                    <span className={styles.choiceText}>与之交谈</span>
                  </button>
                )}
              </div>
            )}
            {battleLoading && (
              <div className={styles.battleHint}>拔剑出鞘...</div>
            )}
          </div>
        </div>
      )}

      {/* 奖励浮层 */}
      {currentReward && (
        <div className={styles.eventOverlay} onClick={handleDismissReward}>
          <div className={styles.rewardCard}>
            <div className={styles.rewardGlow} />
            <p className={styles.rewardMessage}>{currentReward.message}</p>
            {(currentReward.fateDelta !== 0 || currentReward.trustDelta !== 0) && (
              <div className={styles.rewardStats}>
                {currentReward.fateDelta > 0 && <span className={styles.statFate}>缘分 +{currentReward.fateDelta}</span>}
                {currentReward.fateDelta < 0 && <span className={styles.statFateNeg}>缘分 {currentReward.fateDelta}</span>}
                {currentReward.trustDelta > 0 && <span className={styles.statTrust}>信任 +{currentReward.trustDelta}</span>}
                {currentReward.trustDelta < 0 && <span className={styles.statTrustNeg}>信任 {currentReward.trustDelta}</span>}
              </div>
            )}
            {currentReward.itemName && (
              <div className={styles.rewardItem}>获得物品：{currentReward.itemName}</div>
            )}
            {currentReward.memoryTitle && (
              <div className={styles.rewardItem}>获得记忆：{currentReward.memoryTitle}</div>
            )}
            <span className={styles.rewardDismiss}>点击继续</span>
          </div>
        </div>
      )}

      {/* 底部探索按钮 */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomRow}>
          <span className={styles.todayHint}>今日 {status?.todayCount ?? 0} 次</span>
          <button
            className={styles.exploreBtn}
            disabled={ap <= 0 || exploring || (!!currentEvent && !currentReward)}
            onClick={handleExplore}
          >
            <span className={styles.exploreBtnInner}>
              {ap <= 0 ? '行动力不足' : exploring ? '命运织就中...' : '踏入书页'}
            </span>
          </button>
          <span className={styles.todayHint} style={{ visibility: 'hidden' }}>今日 {status?.todayCount ?? 0} 次</span>
        </div>
      </div>
    </div>
  );
}
