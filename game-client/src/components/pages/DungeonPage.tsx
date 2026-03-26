import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import {
  fetchDungeons, enterDungeon, challengeDungeonStage, settleDungeonStage,
  failDungeonStage, exitDungeon, fetchPlayerCurrency,
  type DungeonData, type StageInfoData, type DungeonRewardResult,
} from '../../services/api';
import styles from './DungeonPage.module.css';

const TYPE_META: Record<string, { icon: string; label: string }> = {
  STORY: { icon: '📖', label: '剧情' },
  CHALLENGE: { icon: '⚔️', label: '挑战' },
  BOSS: { icon: '🐉', label: 'BOSS' },
  ENDLESS: { icon: '♾️', label: '无尽' },
  RAID: { icon: '👑', label: '团队' },
  PUZZLE: { icon: '🧩', label: '解谜' },
};

interface SettleResult {
  stageReward: DungeonRewardResult;
  clearReward?: DungeonRewardResult;
  firstClearReward?: DungeonRewardResult;
  isComplete: boolean;
}

export default function DungeonPage() {
  const { navigateTo, pageParams } = useGameStore();
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
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 从战斗页返回时自动结算
  useEffect(() => {
    const battleResult = pageParams?.battleResult as string | undefined;
    const dungeonId = pageParams?.dungeonId as string | undefined;
    if (battleResult && dungeonId) {
      if (battleResult === 'VICTORY') {
        handleSettle(dungeonId);
      } else {
        handleFail(dungeonId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = dungeons.find(d => d.dungeonId === selectedId) || null;

  const handleEnter = useCallback(async (dungeonId: string) => {
    setOperating(true);
    try {
      await enterDungeon(dungeonId, difficulty);
      await loadData();
      setSelectedId(dungeonId);
      toast.info('进入副本！');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '进入失败');
    }
    setOperating(false);
  }, [difficulty, loadData]);

  const handleChallenge = useCallback(async (dungeonId: string) => {
    setOperating(true);
    try {
      await challengeDungeonStage(dungeonId);
      // 跳转战斗页，携带副本信息
      navigateTo('battle', {
        dungeonId,
        dungeonBattle: true,
        fromPage: 'dungeon',
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '挑战失败');
    }
    setOperating(false);
  }, [navigateTo]);

  const handleSettle = useCallback(async (dungeonId: string) => {
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
      try {
        const c = await fetchPlayerCurrency();
        usePlayerStore.getState().setCurrency(c.gold, c.diamond);
      } catch { /* noop */ }
    } catch { /* noop */ }
    setOperating(false);
  }, [loadData]);

  const handleFail = useCallback(async (dungeonId: string) => {
    try {
      await failDungeonStage(dungeonId);
      await loadData();
      toast.error('关卡挑战失败...');
    } catch { /* noop */ }
  }, [loadData]);

  const handleExit = useCallback(async (dungeonId: string) => {
    setOperating(true);
    try {
      await exitDungeon(dungeonId);
      setSelectedId(null);
      await loadData();
    } catch { /* noop */ }
    setOperating(false);
  }, [loadData]);

  const handleBack = useCallback(() => {
    navigateTo('home');
  }, [navigateTo]);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={handleBack}>← 返回</button>
        <span className={styles.pageTitle}>副本</span>
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <div className={styles.scrollArea}>
          {dungeons.map(d => {
            const meta = TYPE_META[d.type] || { icon: '⚔️', label: d.type };
            const isSelected = selectedId === d.dungeonId;
            const isInProgress = d.status === 'IN_PROGRESS';
            const isCompleted = d.status === 'COMPLETED' || d.firstClear;
            const canAttempt = d.dailyRemaining !== 0;

            return (
              <div
                key={d.dungeonId}
                className={`${styles.dungeonCard} ${isSelected ? styles.dungeonCardSelected : ''}`}
                onClick={() => setSelectedId(isSelected ? null : d.dungeonId)}
              >
                {/* 头部信息 */}
                <div className={styles.dungeonHeader}>
                  <span className={styles.dungeonIcon}>{meta.icon}</span>
                  <div className={styles.dungeonInfo}>
                    <div className={styles.dungeonName}>{d.dungeonName}</div>
                    <div className={styles.dungeonMeta}>
                      {meta.label} · Lv.{d.recommendedLevel} · {d.maxStage}关
                      {d.clearCount > 0 && ` · 通关${d.clearCount}次`}
                    </div>
                  </div>
                  <span className={`${styles.dungeonBadge} ${
                    isInProgress ? styles.badgeProgress :
                    isCompleted ? styles.badgeCleared :
                    canAttempt ? styles.badgeNew : styles.badgeLocked
                  }`}>
                    {isInProgress ? '进行中' : isCompleted ? '已通关' : canAttempt ? '可挑战' : '次数用尽'}
                  </span>
                </div>

                {/* 展开详情 */}
                {isSelected && (
                  <div className={styles.detailPanel}>
                    {d.description && (
                      <div className={styles.description}>{d.description}</div>
                    )}

                    {/* 关卡地图 */}
                    {d.stages && d.stages.length > 0 && (
                      <div className={styles.stageMap}>
                        {d.stages.map((stage, idx) => {
                          const completed = d.stageProgress?.some(p => p.stageId === stage.stageId && p.completed);
                          const isCurrent = isInProgress && d.currentStage === stage.stageId;
                          const stars = d.stageProgress?.find(p => p.stageId === stage.stageId)?.stars;

                          return (
                            <div key={stage.stageId} style={{ display: 'flex', alignItems: 'center' }}>
                              <div className={styles.stageNode}>
                                <div className={`${styles.stageCircle} ${
                                  completed ? styles.stageCompleted :
                                  isCurrent ? styles.stageCurrent : styles.stageLocked
                                } ${stage.isBoss ? styles.stageBoss : ''}`}>
                                  {completed ? (stars === 3 ? '★' : `${stars}★`) :
                                   isCurrent ? (stage.isBoss ? '💀' : stage.stageId) :
                                   stage.isBoss ? '👑' : stage.stageId}
                                </div>
                                <span className={styles.stageLabel}>
                                  {stage.isBoss ? stage.enemyName : `第${stage.stageId}关`}
                                </span>
                              </div>
                              {idx < d.stages.length - 1 && (
                                <div className={`${styles.stageLine} ${completed ? styles.stageLineCompleted : ''}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 当前关卡信息 */}
                    {isInProgress && d.stages && (() => {
                      const cur = d.stages.find(s => s.stageId === d.currentStage);
                      if (!cur) return null;
                      return (
                        <div className={styles.infoRow}>
                          <span>当前：{cur.stageName} {cur.isBoss ? '(BOSS)' : ''}</span>
                          <span>敌人：{cur.enemyName} Lv.{cur.enemyLevel}</span>
                        </div>
                      );
                    })()}

                    {/* 每日次数 */}
                    <div className={styles.infoRow}>
                      <span>
                        今日剩余：
                        <span className={d.dailyRemaining === 0 ? styles.remainTagWarning : styles.remainTag}>
                          {d.dailyRemaining < 0 ? '无限制' : `${d.dailyRemaining}/${d.dailyLimit}次`}
                        </span>
                      </span>
                      {d.bestTime > 0 && (
                        <span>最快通关：{Math.round(d.bestTime / 1000)}s</span>
                      )}
                    </div>

                    {/* 首通奖励预览 */}
                    {d.firstClearReward && !d.firstClear && (
                      <div className={styles.rewardPreview}>
                        <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 11 }}>首通奖励：</span>
                        <span className={styles.rewardItem}>
                          <span className={styles.rewardIcon}>💰</span> {d.firstClearReward.gold}
                        </span>
                        <span className={styles.rewardItem}>
                          <span className={styles.rewardIcon}>✨</span> {d.firstClearReward.exp}
                        </span>
                        {d.firstClearReward.title && (
                          <span className={styles.rewardItem}>
                            <span className={styles.rewardIcon}>🏅</span> {d.firstClearReward.title}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 难度选择（未进行中时） */}
                    {!isInProgress && canAttempt && (
                      <div className={styles.difficultyRow}>
                        {[1, 2, 3, 4, 5].map(lv => (
                          <button
                            key={lv}
                            className={`${styles.diffBtn} ${difficulty === lv ? styles.diffBtnActive : ''}`}
                            onClick={(e) => { e.stopPropagation(); setDifficulty(lv); }}
                          >
                            {'★'.repeat(lv)}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className={styles.actionRow}>
                      {isInProgress ? (
                        <>
                          <button
                            className={styles.challengeBtn}
                            disabled={operating}
                            onClick={(e) => { e.stopPropagation(); handleChallenge(d.dungeonId); }}
                          >
                            {operating ? '...' : (() => {
                              const cur = d.stages?.find(s => s.stageId === d.currentStage);
                              return cur?.isBoss ? '挑战 BOSS' : '挑战当前关';
                            })()}
                          </button>
                          <button
                            className={styles.exitBtn}
                            disabled={operating}
                            onClick={(e) => { e.stopPropagation(); handleExit(d.dungeonId); }}
                          >
                            撤退
                          </button>
                        </>
                      ) : canAttempt ? (
                        <button
                          className={styles.enterBtn}
                          disabled={operating}
                          onClick={(e) => { e.stopPropagation(); handleEnter(d.dungeonId); }}
                        >
                          {operating ? '...' : isCompleted ? '再次挑战' : '进入副本'}
                        </button>
                      ) : (
                        <button className={styles.enterBtn} disabled>今日次数已用完</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 结算弹窗 */}
      {settleResult && (
        <div className={styles.resultOverlay} onClick={() => setSettleResult(null)}>
          <div className={styles.resultIcon}>
            {settleResult.isComplete ? '🏆' : '⚔️'}
          </div>
          <div className={`${styles.resultTitle} ${styles.victory}`}>
            {settleResult.isComplete ? '副本通关' : '关卡通过'}
          </div>

          {settleResult.firstClearReward && (
            <div className={styles.firstClearBanner}>首次通关奖励</div>
          )}

          <div className={styles.rewardList}>
            {(() => {
              const allRewards = [settleResult.stageReward, settleResult.clearReward, settleResult.firstClearReward]
                .filter(Boolean) as DungeonRewardResult[];
              const totalGold = allRewards.reduce((s, r) => s + (r.gold || 0), 0);
              const totalExp = allRewards.reduce((s, r) => s + (r.exp || 0), 0);
              const allItems = allRewards.flatMap(r => r.items || []);
              const title = allRewards.find(r => r.title)?.title;

              return (
                <>
                  {totalGold > 0 && (
                    <div className={styles.rewardLine}>
                      <span className={styles.rewardLabel}>💰 金币</span>
                      <span className={styles.rewardValue}>+{totalGold}</span>
                    </div>
                  )}
                  {totalExp > 0 && (
                    <div className={styles.rewardLine}>
                      <span className={styles.rewardLabel}>✨ 经验</span>
                      <span className={styles.rewardValue}>+{totalExp}</span>
                    </div>
                  )}
                  {allItems.map((item, i) => (
                    <div key={i} className={styles.rewardLine}>
                      <span className={styles.rewardLabel}>📦 {item.itemName}</span>
                      <span className={styles.rewardValue}>x{item.quantity}</span>
                    </div>
                  ))}
                  {title && (
                    <div className={styles.rewardLine}>
                      <span className={styles.rewardLabel}>🏅 称号</span>
                      <span className={styles.rewardValue}>{title}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className={styles.resultActions}>
            {settleResult.isComplete ? (
              <button className={styles.btnGold} onClick={() => setSettleResult(null)}>
                返回副本列表
              </button>
            ) : (
              <>
                <button className={styles.btnGold} onClick={() => {
                  setSettleResult(null);
                  if (selectedId) handleChallenge(selectedId);
                }}>
                  继续挑战
                </button>
                <button className={styles.btnGhost} onClick={() => setSettleResult(null)}>
                  返回
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
