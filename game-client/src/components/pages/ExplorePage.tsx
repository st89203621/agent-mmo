import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchExploreStatus, exploreAction, resolveExploreChoice, fetchExploreHistory,
  startExploreCombat, resolveExploreCombat, battleAction, getBattleState,
} from '../../services/api';
import type { ExploreStatus, ExploreEvent, ExploreReward } from '../../types';
import type { BattleData } from '../../services/api';
import styles from './ExplorePage.module.css';

const EVENT_ICONS: Record<string, string> = {
  encounter: '\u{1F464}',
  discovery: '\u{1F48E}',
  lore:      '\u{1F4DC}',
  dilemma:   '\u{1F500}',
  vista:     '\u{26F0}\uFE0F',
  combat:    '\u{2694}\uFE0F',
};

const EVENT_LABELS: Record<string, string> = {
  encounter: '奇遇',
  discovery: '拾遗',
  lore:      '秘闻',
  dilemma:   '抉择',
  vista:     '奇景',
  combat:    '遭遇战',
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

  // 战斗状态
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);

  const bookTitle = currentBookWorld?.title || '未知世界';

  // 加载状态和历史
  const loadData = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([fetchExploreStatus(), fetchExploreHistory()]);
      setStatus(s);
      setRecoverCountdown(s.nextRecoverSec);
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

  useEffect(() => { loadData(); }, [loadData]);

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

  // 探索
  const handleExplore = useCallback(async () => {
    if (exploring || !status || status.actionPoints <= 0) return;
    setExploring(true);
    setCurrentReward(null);
    setBattle(null);
    setBattleLog([]);
    try {
      const { event } = await exploreAction(currentWorldIndex, bookTitle);
      setCurrentEvent(event);
      const s = await fetchExploreStatus();
      setStatus(s);
      setRecoverCountdown(s.nextRecoverSec);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '探索失败');
    } finally {
      setExploring(false);
    }
  }, [exploring, status, currentWorldIndex, bookTitle]);

  // 普通事件选择
  const handleChoice = useCallback(async (choiceId: number) => {
    if (resolving || !currentEvent) return;

    // combat 类型：choiceId=0 是迎战，choiceId=1 是逃跑
    if (currentEvent.type === 'combat' && choiceId === 0) {
      // 进入战斗
      setBattleLoading(true);
      try {
        const { battle: b } = await startExploreCombat(currentEvent.eventId, currentEvent.enemyName || '妖兽');
        setBattle(b);
        setBattleLog([]);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : '战斗发起失败');
      } finally {
        setBattleLoading(false);
      }
      return;
    }

    // 普通选择 / combat 逃跑
    setResolving(true);
    try {
      const reward = await resolveExploreChoice(currentEvent.eventId, choiceId);
      setCurrentReward(reward);
      setHistory(prev => [{ event: currentEvent, reward }, ...prev]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setResolving(false);
    }
  }, [resolving, currentEvent]);

  // 战斗行动
  const handleBattleAction = useCallback(async (actionType: string) => {
    if (!battle || battleLoading) return;
    setBattleLoading(true);
    try {
      const { battle: b } = await battleAction(actionType);
      setBattle(b);
      // 累积战斗日志
      if (b.actionLog) {
        setBattleLog(prev => [...prev, ...b.actionLog.map(a => a.description)]);
      }
      // 战斗结束 → 自动结算
      if (b.status === 'VICTORY' || b.status === 'DEFEAT') {
        // 延迟一下让玩家看到最后一击
        setTimeout(async () => {
          if (!currentEvent) return;
          try {
            const reward = await resolveExploreCombat(currentEvent.eventId);
            setCurrentReward(reward);
            setHistory(prev => [{ event: currentEvent, reward }, ...prev]);
          } catch {
            // 静默
          }
        }, 1200);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '战斗操作失败');
    } finally {
      setBattleLoading(false);
    }
  }, [battle, battleLoading, currentEvent]);

  // 关闭奖励
  const handleDismissReward = useCallback(() => {
    setCurrentEvent(null);
    setCurrentReward(null);
    setBattle(null);
    setBattleLog([]);
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

  const hpPercent = (hp: number, maxHp: number) => Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const hpColor = (pct: number) => pct > 50 ? '#8bc563' : pct > 20 ? '#d4a84c' : '#c44e52';

  // 是否正在战斗中（显示战斗面板而非选择按钮）
  const inCombat = !!battle && !currentReward;

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
        {/* 当前事件卡片 */}
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

            {/* 非战斗状态：显示选择按钮 */}
            {!inCombat && !battleLoading && (
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
            )}

            {/* 战斗加载中 */}
            {battleLoading && !battle && (
              <div className={styles.generating}>拔剑出鞘...</div>
            )}

            {/* ── 内嵌战斗面板 ── */}
            {inCombat && (
              <div className={styles.battlePanel}>
                {/* 敌方 */}
                {battle.enemyUnits.map(u => (
                  <div key={u.unitId} className={styles.battleUnit} style={{ opacity: u.hp > 0 ? 1 : 0.4 }}>
                    <div className={styles.unitHeader}>
                      <span className={styles.unitName} data-type="enemy">{u.name}</span>
                      <span className={styles.unitHpText}>{u.hp}/{u.maxHp}</span>
                    </div>
                    <div className={styles.hpBarBg}>
                      <div
                        className={styles.hpBar}
                        style={{
                          width: `${hpPercent(u.hp, u.maxHp)}%`,
                          background: hpColor(hpPercent(u.hp, u.maxHp)),
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div className={styles.battleDivider}>VS</div>

                {/* 我方 */}
                {battle.playerUnits.map(u => (
                  <div key={u.unitId} className={styles.battleUnit}>
                    <div className={styles.unitHeader}>
                      <span className={styles.unitName} data-type="player">{u.name}</span>
                      <span className={styles.unitHpText}>{u.hp}/{u.maxHp}</span>
                    </div>
                    <div className={styles.hpBarBg}>
                      <div
                        className={styles.hpBar}
                        style={{
                          width: `${hpPercent(u.hp, u.maxHp)}%`,
                          background: hpColor(hpPercent(u.hp, u.maxHp)),
                        }}
                      />
                    </div>
                    <div className={styles.hpBarBg} style={{ marginTop: 3 }}>
                      <div
                        className={styles.hpBar}
                        style={{
                          width: `${hpPercent(u.mp, u.maxMp)}%`,
                          background: '#55a5db',
                        }}
                      />
                    </div>
                    <div className={styles.mpText}>MP {u.mp}/{u.maxMp}</div>
                  </div>
                ))}

                {/* 战斗日志 */}
                {battleLog.length > 0 && (
                  <div className={styles.battleLogArea}>
                    {battleLog.slice(-4).map((msg, i) => (
                      <div key={i} className={styles.battleLogLine}>{msg}</div>
                    ))}
                  </div>
                )}

                {/* 战斗结果 */}
                {(battle.status === 'VICTORY' || battle.status === 'DEFEAT') && (
                  <div className={styles.battleResult} data-result={battle.status}>
                    {battle.status === 'VICTORY' ? '胜利！' : '战败...'}
                  </div>
                )}

                {/* 行动按钮 */}
                {battle.status === 'ONGOING' && (
                  <div className={styles.battleActions}>
                    <button
                      className={styles.battleBtn}
                      data-action="attack"
                      disabled={battleLoading}
                      onClick={() => handleBattleAction('ATTACK')}
                    >
                      攻击
                    </button>
                    <button
                      className={styles.battleBtn}
                      data-action="skill"
                      disabled={battleLoading || (battle.playerUnits[0]?.mp ?? 0) < 10}
                      onClick={() => handleBattleAction('SKILL')}
                    >
                      法术
                    </button>
                    <button
                      className={styles.battleBtn}
                      data-action="defend"
                      disabled={battleLoading}
                      onClick={() => handleBattleAction('DEFEND')}
                    >
                      防御
                    </button>
                  </div>
                )}
              </div>
            )}
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
