import React, { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchExploreStatus, exploreAction, resolveExploreChoice, fetchExploreHistory,
  startExploreCombat, resolveExploreCombat,
  fetchPlayerCurrency, fetchRelations, generateSceneImage, fetchPersonInfo,
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

// 路径常量
const JOURNEY_W = 390;
const CENTER_X = JOURNEY_W / 2;
const SPACING_Y = 80;
const AMPLITUDE = 60;
const PAD_TOP = 50;
const VIEWPORT_BUFFER = 200; // 可视区外多渲染的像素

// ── 倒计时独立组件，避免每秒重渲染整个页面 ──
const RecoverTimer = memo(function RecoverTimer({
  status, onStatusUpdate,
}: {
  status: ExploreStatus;
  onStatusUpdate: (s: ExploreStatus) => void;
}) {
  const [countdown, setCountdown] = useState(status.nextRecoverSec);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => { setCountdown(status.nextRecoverSec); }, [status.nextRecoverSec]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (status.actionPoints >= status.maxPoints || countdown <= 0) return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchExploreStatus().then(onStatusUpdate).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status.actionPoints, status.maxPoints, countdown, onStatusUpdate]);

  if (status.actionPoints >= status.maxPoints || countdown <= 0) return null;
  const m = Math.floor(countdown / 60);
  const s = countdown % 60;
  return <span className={styles.recoverText}>{m}:{s.toString().padStart(2, '0')}</span>;
});

// ── 单个事件节点 ──
const EventNode = memo(function EventNode({
  item, wp, isLeft, expanded, onToggle,
}: {
  item: ResolvedEvent;
  wp: { x: number; y: number };
  isLeft: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const desc = item.reward.message || item.event.description || '';
  const brief = desc.length > 20 ? desc.slice(0, 20) + '…' : desc;

  return (
    <div
      className={`${styles.node} ${expanded ? styles.nodeExpanded : ''}`}
      data-type={item.event.type}
      style={{ left: wp.x, top: wp.y }}
      onClick={onToggle}
    >
      <div className={styles.nodeCircle} data-type={item.event.type} />
      <div className={styles.nodeLabel} data-side={isLeft ? 'left' : 'right'}>
        <span className={styles.labelType} data-type={item.event.type}>
          {EVENT_LABELS[item.event.type] || item.event.type}
        </span>
        <span className={styles.labelTitle}>{item.event.title}</span>
        {brief && !expanded && <span className={styles.labelBrief}>{brief}</span>}
      </div>
      {expanded && (
        <div className={styles.detailCard} data-side={isLeft ? 'right' : 'left'} data-type={item.event.type}>
          <div className={styles.detailAccent} data-type={item.event.type} />
          <div className={styles.detailHead}>
            <span className={styles.detailType} data-type={item.event.type}>
              {EVENT_LABELS[item.event.type] || item.event.type}
            </span>
            <span className={styles.detailTitle}>{item.event.title}</span>
          </div>
          {item.reward.imageUrl && (
            <div className={styles.detailImage}>
              <img src={item.reward.imageUrl} alt={item.event.title} loading="lazy" />
            </div>
          )}
          <p className={styles.detailMsg}>{desc}</p>
          {(item.reward.fateDelta !== 0 || item.reward.trustDelta !== 0 || item.reward.itemName) && (
            <div className={styles.detailDivider} />
          )}
          {(item.reward.fateDelta !== 0 || item.reward.trustDelta !== 0) && (
            <div className={styles.detailStats}>
              {item.reward.fateDelta !== 0 && (
                <span className={styles.detailStat} data-positive={item.reward.fateDelta > 0 ? '' : undefined} data-negative={item.reward.fateDelta < 0 ? '' : undefined}>
                  缘 {item.reward.fateDelta > 0 ? '+' : ''}{item.reward.fateDelta}
                </span>
              )}
              {item.reward.trustDelta !== 0 && (
                <span className={styles.detailStat} data-positive={item.reward.trustDelta > 0 ? '' : undefined} data-negative={item.reward.trustDelta < 0 ? '' : undefined}>
                  信 {item.reward.trustDelta > 0 ? '+' : ''}{item.reward.trustDelta}
                </span>
              )}
            </div>
          )}
          {item.reward.itemName && (
            <div className={styles.detailReward}>
              <span className={styles.rewardDot} />
              {item.reward.itemName}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

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
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(800);

  const bookTitle = currentBookWorld?.title || '';

  // 背景图
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

  const loadData = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([fetchExploreStatus(), fetchExploreHistory()]);
      setStatus(s);
      setHistory(h.events.map((e: ExploreEvent) => ({
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

  const syncAfterReward = useCallback(async () => {
    try {
      const [cur, rel, person] = await Promise.all([
        fetchPlayerCurrency().catch(() => null),
        fetchRelations().catch(() => null),
        fetchPersonInfo().catch(() => null),
      ]);
      if (cur) usePlayerStore.getState().setCurrency(cur.gold, cur.diamond);
      if (rel) usePlayerStore.getState().setRelations(rel.relations);
      if (person?.level) usePlayerStore.getState().setLevelInfo(person.level);
    } catch { /* 静默 */ }
  }, []);

  const handleStatusUpdate = useCallback((s: ExploreStatus) => setStatus(s), []);

  const handleExplore = useCallback(async () => {
    if (exploring || !status || status.actionPoints <= 0) return;
    setExploring(true);
    setCurrentReward(null);
    setEventImageUrl(null);
    try {
      const { event } = await exploreAction(currentWorldIndex, bookTitle);
      setCurrentEvent(event);
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
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '探索失败');
    } finally {
      setExploring(false);
    }
  }, [exploring, status, currentWorldIndex, bookTitle]);

  const eventImageUrlRef = useRef(eventImageUrl);
  eventImageUrlRef.current = eventImageUrl;

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
      setHistory(prev => [{ event: currentEvent, reward: { ...reward, imageUrl: eventImageUrlRef.current } }, ...prev]);
      syncAfterReward();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setResolving(false);
    }
  }, [resolving, currentEvent, navigateTo, syncAfterReward]);

  const pendingResolveRef = useRef<string | null>(null);

  const handleDismissReward = useCallback(() => {
    setCurrentEvent(null);
    setCurrentReward(null);
  }, []);

  useEffect(() => { generateBg(); }, [generateBg]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!loading && mapScrollRef.current) {
      mapScrollRef.current.scrollTop = mapScrollRef.current.scrollHeight;
    }
  }, [loading, history.length]);

  // 滚动监听（节流）
  useEffect(() => {
    const el = mapScrollRef.current;
    if (!el) return;
    setViewportH(el.clientHeight);
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrollTop(el.scrollTop);
          ticking = false;
        });
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loading]);

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

  // ── 所有昂贵计算用 useMemo（必须在条件返回之前）──

  const mapEvents = useMemo(() => [...history].reverse(), [history]);

  const waypoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    pts.push({ x: CENTER_X, y: PAD_TOP });
    mapEvents.forEach((_, i) => {
      const y = PAD_TOP + (i + 1) * SPACING_Y;
      const x = CENTER_X + Math.sin((i + 1) * 0.8) * AMPLITUDE;
      pts.push({ x, y });
    });
    pts.push({ x: CENTER_X, y: PAD_TOP + (mapEvents.length + 1) * SPACING_Y });
    return pts;
  }, [mapEvents]);

  const journeyPath = useMemo(() => {
    if (waypoints.length < 2) return '';
    const d: string[] = [`M ${waypoints[0].x} ${waypoints[0].y}`];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p0 = waypoints[Math.max(i - 1, 0)];
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const p3 = waypoints[Math.min(i + 2, waypoints.length - 1)];
      d.push(`C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`);
    }
    return d.join(' ');
  }, [waypoints]);

  const visibleRange = useMemo(() => {
    const top = scrollTop - VIEWPORT_BUFFER;
    const bottom = scrollTop + viewportH + VIEWPORT_BUFFER;
    return { top, bottom };
  }, [scrollTop, viewportH]);

  // ── 条件返回 ──

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
  const maxAp = status?.maxPoints ?? 100;
  const journeyH = waypoints[waypoints.length - 1].y + 100;
  const canExplore = ap > 0 && !exploring && (!currentEvent || !!currentReward);

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

      {/* 头部 */}
      <div className={styles.mapHeader}>
        <div className={styles.mapTitleRow}>
          <span className={styles.mapTitle}>{bookTitle}</span>
          <span className={styles.mapSubtitle}>书中漫步</span>
          <button className={styles.bgRefreshBtn} disabled={bgLoading} onClick={() => generateBg(true)} title="换背景">
            {bgLoading ? '...' : '🎨'}
          </button>
        </div>
        <div className={styles.apRow}>
          <div className={styles.apBar}>
            <div className={styles.apBarFill} style={{ width: `${(ap / maxAp) * 100}%` }} />
          </div>
          <span className={styles.apText}>{ap}/{maxAp}</span>
          {status && <RecoverTimer status={status} onStatusUpdate={handleStatusUpdate} />}
        </div>
      </div>

      {/* 行旅图主体 */}
      <div className={styles.mapBody} ref={mapScrollRef}>
        <div className={styles.journey} style={{ height: journeyH }}>
          {/* 金色路径 — 不用 filter，用 opacity 分层代替昂贵的高斯模糊 */}
          <svg className={styles.journeySvg} viewBox={`0 0 ${JOURNEY_W} ${journeyH}`} preserveAspectRatio="none">
            {journeyPath && (
              <>
                <path d={journeyPath} fill="none" stroke="rgba(201,168,76,0.08)" strokeWidth="12" strokeLinecap="round" />
                <path d={journeyPath} fill="none" stroke="rgba(201,168,76,0.18)" strokeWidth="5" strokeLinecap="round" />
                <path d={journeyPath} fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5" strokeLinecap="round" />
              </>
            )}
          </svg>

          {/* 起点 */}
          <div className={styles.originMark} style={{ left: waypoints[0].x, top: waypoints[0].y }}>
            <div className={styles.originCircle} />
            <span className={styles.originText}>起点</span>
          </div>

          {/* 事件节点 — 虚拟化 */}
          {mapEvents.map((item, i) => {
            const wp = waypoints[i + 1];
            if (!wp) return null;
            // 可视区裁剪
            if (wp.y < visibleRange.top || wp.y > visibleRange.bottom) return null;
            const isLeft = wp.x < CENTER_X;
            const nodeId = item.event.eventId + i;
            return (
              <EventNode
                key={nodeId}
                item={item}
                wp={wp}
                isLeft={isLeft}
                expanded={expandedNode === nodeId}
                onToggle={() => setExpandedNode(prev => prev === nodeId ? null : nodeId)}
              />
            );
          })}

          {/* 当前位置 — 探索触发 */}
          <div
            className={`${styles.currentMark} ${canExplore ? styles.currentActive : ''}`}
            style={{ left: waypoints[waypoints.length - 1].x, top: waypoints[waypoints.length - 1].y }}
            onClick={canExplore ? handleExplore : undefined}
          >
            <div className={styles.currentRing} />
            <div className={styles.currentCircle} />
            <span className={styles.currentText}>
              {exploring ? '命运织就中...' : ap <= 0 ? '行动力不足' : currentEvent && !currentReward ? '事件进行中' : '点击探索'}
            </span>
          </div>
        </div>
      </div>

      {/* 事件浮层 */}
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
                  <button key={c.id} className={styles.choiceBtn} data-risk={c.risk} disabled={resolving} onClick={() => handleChoice(c.id)}>
                    <span className={styles.choiceText}>{c.text}</span>
                    {c.risk !== 'low' && (
                      <span className={styles.riskTag} data-risk={c.risk}>{RISK_LABELS[c.risk] || c.risk}</span>
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
            {battleLoading && <div className={styles.battleHint}>拔剑出鞘...</div>}
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
            {currentReward.itemName && <div className={styles.rewardItem}>获得物品：{currentReward.itemName}</div>}
            {currentReward.memoryTitle && <div className={styles.rewardItem}>获得记忆：{currentReward.memoryTitle}</div>}
            <span className={styles.rewardDismiss}>点击继续</span>
          </div>
        </div>
      )}

      {/* 底部 */}
      <div className={styles.bottomBar}>
        <span className={styles.todayHint}>今日探索 {status?.todayCount ?? 0} 次</span>
      </div>
    </div>
  );
}
