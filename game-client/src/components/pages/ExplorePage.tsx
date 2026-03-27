import React, { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchExploreStatus, exploreAction, resolveExploreChoice, fetchExploreHistory,
  startExploreCombat, resolveExploreCombat,
  fetchPlayerCurrency, fetchRelations, generateSceneImage,
} from '../../services/api';
import type { ExploreStatus, ExploreEvent, ExploreReward } from '../../types';
import styles from './ExplorePage.module.css';

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

  // 曲线路径：测量所有节点位置，生成一条完整 SVG path
  const trailRef = useRef<HTMLDivElement>(null);
  const originDotRef = useRef<HTMLDivElement>(null);
  const currentDotRef = useRef<HTMLDivElement>(null);
  const nodeCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [trailPath, setTrailPath] = useState('');

  useLayoutEffect(() => {
    const trail = trailRef.current;
    if (!trail) return;
    const rect = trail.getBoundingClientRect();
    const points: { x: number; y: number }[] = [];

    // 收集所有锚点：起点 → 各节点 → 当前位置
    const addPoint = (el: HTMLElement | null) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      points.push({ x: r.left + r.width / 2 - rect.left, y: r.top + r.height / 2 - rect.top });
    };
    addPoint(originDotRef.current);
    nodeCardRefs.current.forEach(addPoint);
    addPoint(currentDotRef.current);

    if (points.length < 2) { setTrailPath(''); return; }

    // 用 Catmull-Rom → cubic bezier 生成平滑曲线
    const d: string[] = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
    }
    setTrailPath(d.join(' '));
  }, [loading, history.length, exploring]);

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
        <div className={styles.mapTrail} ref={trailRef}>
          {/* 整体曲线 */}
          {trailPath && (
            <svg className={styles.trailSvg}>
              <path className={styles.trailLine} d={trailPath} />
            </svg>
          )}

          {/* 起点 */}
          <div className={styles.trailOrigin}>
            <div className={styles.originDot} ref={originDotRef} />
            <span className={styles.originLabel}>起点</span>
          </div>

          {/* 历史节点 */}
          {mapEvents.map((item, i) => (
            <div
              key={item.event.eventId + i}
              className={styles.mapNode}
              data-type={item.event.type}
              style={{ '--n': i } as React.CSSProperties}
            >
              <div className={styles.nodeDot} data-type={item.event.type} />
              <div
                className={styles.nodeCard}
                ref={el => { nodeCardRefs.current[i] = el; }}
              >
                <div className={styles.cardAccent} data-type={item.event.type} />
                <div className={styles.nodeHead}>
                  <span className={styles.nodeType} data-type={item.event.type}>
                    {EVENT_LABELS[item.event.type] || item.event.type}
                  </span>
                  <span className={styles.nodeTitle}>{item.event.title}</span>
                </div>
                {item.reward.message && (
                  <span className={styles.nodeReward}>{item.reward.message}</span>
                )}
              </div>
            </div>
          ))}

          {/* 当前位置 — 可点击探索 */}
          <div
            className={`${styles.currentPos} ${ap > 0 && !exploring && (!currentEvent || !!currentReward) ? styles.currentClickable : ''}`}
            onClick={handleExplore}
          >
            <div className={styles.currentPulse} />
            <div className={styles.currentDot} ref={currentDotRef} />
            <span className={styles.currentLabel}>
              {exploring ? '命运织就中...' : ap <= 0 ? '行动力不足' : currentEvent && !currentReward ? '事件进行中' : '点击探索'}
            </span>
            <span className={styles.currentAp}>{ap}/{maxAp}{ap < maxAp && recoverCountdown > 0 ? ` · ${formatTime(recoverCountdown)}` : ''}</span>
          </div>

          {/* 未探索迷雾 */}
          <div className={styles.unexplored}>
            <span className={styles.mistText}>未知领域</span>
          </div>
        </div>
      </div>

      {/* 事件浮层 — 当前事件卡片 */}
      {currentEvent && !currentReward && (
        <div className={styles.eventOverlay} data-type={currentEvent.type}>
          <div className={styles.eventCard}>
            <div className={styles.cardBadge} data-type={currentEvent.type}>
              {EVENT_LABELS[currentEvent.type] || currentEvent.type}
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

      {/* 底部信息 */}
      <div className={styles.bottomBar}>
        <span className={styles.todayHint}>今日探索 {status?.todayCount ?? 0} 次</span>
      </div>
    </div>
  );
}
