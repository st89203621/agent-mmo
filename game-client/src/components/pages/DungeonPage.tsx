import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import {
  fetchDungeons,
  enterDungeon,
  challengeDungeonStage,
  settleDungeonStage,
  failDungeonStage,
  exitDungeon,
  fetchPlayerCurrency,
  fetchPersonInfo,
  type DungeonData,
  type DungeonRewardResult,
} from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';

const TYPE_META: Record<string, { icon: string; label: string }> = {
  STORY: { icon: '卷', label: '剧 情' },
  CHALLENGE: { icon: '锋', label: '挑 战' },
  BOSS: { icon: '魁', label: 'BOSS' },
  ENDLESS: { icon: '∞', label: '无 尽' },
  RAID: { icon: '帅', label: '团 队' },
  PUZZLE: { icon: '谜', label: '解 谜' },
};

interface SettleResult {
  stageReward: DungeonRewardResult;
  clearReward?: DungeonRewardResult;
  firstClearReward?: DungeonRewardResult;
  isComplete: boolean;
}

export default function DungeonPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const pageParams = useGameStore((s) => s.pageParams);
  const [dungeons, setDungeons] = useState<DungeonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDungeons();
      setDungeons(res.dungeons || []);
    } catch {
      /* noop */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettle = useCallback(
    async (dungeonId: string) => {
      setOperating(true);
      try {
        const res = await settleDungeonStage(dungeonId);
        setSettleResult({
          stageReward: res.stageReward,
          clearReward: res.clearReward,
          firstClearReward: res.firstClearReward,
          isComplete: res.dungeon.status === 'COMPLETED',
        });
        await loadData();
        await Promise.allSettled([
          fetchPlayerCurrency().then((c) =>
            usePlayerStore.getState().setCurrency(c.gold, c.diamond),
          ),
          fetchPersonInfo().then((p) => {
            if (p.level) usePlayerStore.getState().setLevelInfo(p.level);
          }),
        ]);
      } catch {
        /* noop */
      }
      setOperating(false);
    },
    [loadData],
  );

  const handleFail = useCallback(
    async (dungeonId: string) => {
      try {
        await failDungeonStage(dungeonId);
        await loadData();
        toast.error('关卡挑战失败...');
      } catch {
        /* noop */
      }
    },
    [loadData],
  );

  useEffect(() => {
    const battleResult = pageParams?.battleResult as string | undefined;
    const dungeonId = pageParams?.dungeonId as string | undefined;
    if (!battleResult || !dungeonId) return;
    if (battleResult === 'VICTORY') handleSettle(dungeonId);
    else handleFail(dungeonId);
  }, [pageParams, handleSettle, handleFail]);

  const selected = dungeons.find((d) => d.dungeonId === selectedId) || null;

  const handleEnter = useCallback(
    async (dungeonId: string) => {
      setOperating(true);
      try {
        await enterDungeon(dungeonId, difficulty);
        await loadData();
        setSelectedId(dungeonId);
        toast.info('进入副本');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '进入失败');
      }
      setOperating(false);
    },
    [difficulty, loadData],
  );

  const handleChallenge = useCallback(
    async (dungeonId: string) => {
      setOperating(true);
      try {
        await challengeDungeonStage(dungeonId);
        navigateTo('battle', {
          dungeonId,
          dungeonBattle: true,
          fromPage: 'dungeon',
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '挑战失败');
      }
      setOperating(false);
    },
    [navigateTo],
  );

  const handleExit = useCallback(
    async (dungeonId: string) => {
      setOperating(true);
      try {
        await exitDungeon(dungeonId);
        setSelectedId(null);
        await loadData();
      } catch {
        /* noop */
      }
      setOperating(false);
    },
    [loadData],
  );

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>副 本</span>
            <span className={styles.appbarZone}>剧 情 · 挑 战 · BOSS</span>
          </div>
          <div className={styles.appbarIcons}>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => navigateTo('home')}
              aria-label="返回"
            >回</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.dgLoading}>副本信息载入中 ...</div>
      ) : dungeons.length === 0 ? (
        <div className={styles.feedEmpty}>暂无可挑战副本</div>
      ) : (
        <div className={`${styles.scrollPlain} ${styles.dgList}`}>
          {dungeons.map((d) => {
            const meta = TYPE_META[d.type] || { icon: '锋', label: d.type };
            const isSelected = selectedId === d.dungeonId;
            const isInProgress = d.status === 'IN_PROGRESS';
            const isCompleted = d.status === 'COMPLETED' || d.firstClear;
            const canAttempt = d.dailyRemaining !== 0;

            const badgeCls = isInProgress
              ? styles.dgBadgeProgress
              : isCompleted
                ? styles.dgBadgeCleared
                : canAttempt
                  ? styles.dgBadgeNew
                  : styles.dgBadgeLocked;
            const badgeLabel = isInProgress
              ? '进行中'
              : isCompleted
                ? '已通关'
                : canAttempt
                  ? '可挑战'
                  : '次数用尽';

            return (
              <div
                key={d.dungeonId}
                className={`${styles.dgCard} ${isSelected ? styles.dgCardOn : ''}`.trim()}
                onClick={() => setSelectedId(isSelected ? null : d.dungeonId)}
              >
                <div className={styles.dgHead}>
                  <div className={styles.dgIcon}>{meta.icon}</div>
                  <div className={styles.dgInfo}>
                    <div className={styles.dgName}>{d.dungeonName}</div>
                    <div className={styles.dgMeta}>
                      {meta.label} · Lv.{d.recommendedLevel} · {d.maxStage} 关
                      {d.clearCount > 0 && ` · 通关 ${d.clearCount} 次`}
                    </div>
                  </div>
                  <span className={`${styles.dgBadge} ${badgeCls}`}>{badgeLabel}</span>
                </div>

                {isSelected && (
                  <div className={styles.dgDetail}>
                    {d.description && <div className={styles.dgDesc}>{d.description}</div>}

                    {d.stages && d.stages.length > 0 && (
                      <div className={styles.dgMap}>
                        {d.stages.map((stage, idx) => {
                          const completed = d.stageProgress?.some(
                            (p) => p.stageId === stage.stageId && p.completed,
                          );
                          const isCurrent = isInProgress && d.currentStage === stage.stageId;
                          const stars = d.stageProgress?.find(
                            (p) => p.stageId === stage.stageId,
                          )?.stars;

                          const circleCls = completed
                            ? styles.dgCircleDone
                            : isCurrent
                              ? styles.dgCircleCur
                              : styles.dgCircleLocked;

                          return (
                            <div
                              key={stage.stageId}
                              style={{ display: 'flex', alignItems: 'flex-start' }}
                            >
                              <div className={styles.dgNode}>
                                <div
                                  className={`${styles.dgCircle} ${circleCls} ${stage.isBoss ? styles.dgCircleBoss : ''}`.trim()}
                                >
                                  {completed
                                    ? stars === 3
                                      ? '★'
                                      : `${stars ?? 1}★`
                                    : isCurrent
                                      ? stage.isBoss
                                        ? '煞'
                                        : stage.stageId
                                      : stage.isBoss
                                        ? '煞'
                                        : stage.stageId}
                                </div>
                                <span className={styles.dgNodeLabel}>
                                  {stage.isBoss ? stage.enemyName : `第 ${stage.stageId} 关`}
                                </span>
                              </div>
                              {idx < d.stages.length - 1 && (
                                <div
                                  className={`${styles.dgLine} ${completed ? styles.dgLineDone : ''}`.trim()}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isInProgress && d.stages && (() => {
                      const cur = d.stages.find((s) => s.stageId === d.currentStage);
                      if (!cur) return null;
                      return (
                        <div className={styles.dgRow}>
                          <span>
                            当前 · {cur.stageName}
                            {cur.isBoss ? ' · BOSS' : ''}
                          </span>
                          <span>
                            敌人 · {cur.enemyName} Lv.{cur.enemyLevel}
                          </span>
                        </div>
                      );
                    })()}

                    <div className={styles.dgRow}>
                      <span>
                        今日剩余
                        <span
                          className={d.dailyRemaining === 0 ? styles.dgTagWarn : styles.dgTagOk}
                        >
                          {d.dailyRemaining < 0 ? '无限制' : `${d.dailyRemaining}/${d.dailyLimit}`}
                        </span>
                      </span>
                      {d.bestTime > 0 && <span>最快 · {Math.round(d.bestTime / 1000)}s</span>}
                    </div>

                    {d.firstClearReward && !d.firstClear && (
                      <div className={styles.dgRewardRow}>
                        <span className={styles.dgRewardRowLabel}>首 通</span>
                        <span>金币 {d.firstClearReward.gold}</span>
                        <span>经验 {d.firstClearReward.exp}</span>
                        {d.firstClearReward.title && <span>称号 {d.firstClearReward.title}</span>}
                      </div>
                    )}

                    {!isInProgress && canAttempt && (
                      <div className={styles.dgDiffRow}>
                        {[1, 2, 3, 4, 5].map((lv) => (
                          <button
                            key={lv}
                            type="button"
                            className={`${styles.dgDiffBtn} ${difficulty === lv ? styles.dgDiffBtnOn : ''}`.trim()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDifficulty(lv);
                            }}
                          >
                            {'★'.repeat(lv)}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className={styles.dgActs}>
                      {isInProgress ? (
                        <>
                          <button
                            type="button"
                            className={`${styles.dgPrim} ${styles.dgDanger}`}
                            disabled={operating}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChallenge(d.dungeonId);
                            }}
                          >
                            {(() => {
                              const cur = d.stages?.find((s) => s.stageId === d.currentStage);
                              if (operating) return '...';
                              return cur?.isBoss ? '挑 战 BOSS' : '挑 战 当 前 关';
                            })()}
                          </button>
                          <button
                            type="button"
                            className={styles.dgGhost}
                            disabled={operating}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExit(d.dungeonId);
                            }}
                          >
                            撤 退
                          </button>
                        </>
                      ) : canAttempt ? (
                        <button
                          type="button"
                          className={styles.dgPrim}
                          disabled={operating}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnter(d.dungeonId);
                          }}
                        >
                          {operating ? '...' : isCompleted ? '再 次 挑 战' : '进 入 副 本'}
                        </button>
                      ) : (
                        <button type="button" className={styles.dgPrim} disabled>
                          今 日 次 数 已 用 完
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {settleResult && (
        <div className={styles.dgOverlay} onClick={() => setSettleResult(null)}>
          <div className={styles.dgResultIc}>{settleResult.isComplete ? '爵' : '锋'}</div>
          <div className={styles.dgResultTitle}>
            {settleResult.isComplete ? '副 本 通 关' : '关 卡 通 过'}
          </div>
          {settleResult.firstClearReward && (
            <div className={styles.dgResultBanner}>首 次 通 关 奖 励</div>
          )}

          <div className={styles.dgRewardBox}>
            {(() => {
              const rewards = [
                settleResult.stageReward,
                settleResult.clearReward,
                settleResult.firstClearReward,
              ].filter(Boolean) as DungeonRewardResult[];
              const totalGold = rewards.reduce((s, r) => s + (r.gold || 0), 0);
              const totalExp = rewards.reduce((s, r) => s + (r.exp || 0), 0);
              const items = rewards.flatMap((r) => r.items || []);
              const title = rewards.find((r) => r.title)?.title;
              return (
                <>
                  {totalGold > 0 && (
                    <div className={styles.dgRewardLine}>
                      <span className={styles.dgRewardK}>金 币</span>
                      <span className={styles.dgRewardV}>+{totalGold}</span>
                    </div>
                  )}
                  {totalExp > 0 && (
                    <div className={styles.dgRewardLine}>
                      <span className={styles.dgRewardK}>经 验</span>
                      <span className={styles.dgRewardV}>+{totalExp}</span>
                    </div>
                  )}
                  {items.map((item, i) => (
                    <div key={i} className={styles.dgRewardLine}>
                      <span className={styles.dgRewardK}>{item.itemName}</span>
                      <span className={styles.dgRewardV}>× {item.quantity}</span>
                    </div>
                  ))}
                  {title && (
                    <div className={styles.dgRewardLine}>
                      <span className={styles.dgRewardK}>称 号</span>
                      <span className={styles.dgRewardV}>{title}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className={styles.dgResultActs}>
            {settleResult.isComplete ? (
              <button
                type="button"
                className={`${styles.dgResultBtn} ${styles.dgResultBtnGold}`}
                onClick={() => setSettleResult(null)}
              >
                返 回 列 表
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={`${styles.dgResultBtn} ${styles.dgResultBtnGold}`}
                  onClick={() => {
                    setSettleResult(null);
                    if (selected) handleChallenge(selected.dungeonId);
                  }}
                >
                  继 续 挑 战
                </button>
                <button
                  type="button"
                  className={`${styles.dgResultBtn} ${styles.dgResultBtnGhost}`}
                  onClick={() => setSettleResult(null)}
                >
                  返 回
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
