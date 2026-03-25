import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { usePhaserGame } from '../../phaser/usePhaserGame';
import BattleScene from '../../phaser/BattleScene';
import { useTransparentPortrait } from '../../hooks/useTransparentPortrait';
import {
  startBattle, getBattleState, battleAction, fetchPersonInfo, fetchPlayerCurrency,
  type BattleData, type BattleUnitData, type BattleActionData, type BattleSkillData,
} from '../../services/api';
import styles from './BattlePage.module.css';

const EFFECT_TYPES: Record<string, string> = {
  physical_damage: '物理伤害',
  magic_damage: '魔法伤害',
  buff_defense: '提升防御',
  heal: '恢复生命',
};

/* ── 浮动伤害 ── */
interface FloatingNumber { id: number; unitId: string; value: number; isHeal: boolean }
let seqId = 0;

/* ═══════════ 技能Tooltip ═══════════ */
function SkillTooltip({ skill }: { skill: BattleSkillData }) {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.tooltipWrap}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow(true)} onTouchEnd={() => setShow(false)}
    >
      {show && (
        <div className={styles.tooltip}>
          <strong>{skill.name}</strong>
          {skill.mpCost > 0 && <span> (消耗 {skill.mpCost} MP)</span>}
          {skill.damageMultiplier > 0 && <div>倍率: {skill.damageMultiplier}x</div>}
          {skill.effectType && <div>{EFFECT_TYPES[skill.effectType] || skill.effectType}</div>}
        </div>
      )}
    </div>
  );
}

/* ═══════════ 立绘组件（支持AI生成图+透明背景处理） ═══════════ */
function PortraitImage({ unit, isPlayer }: { unit: BattleUnitData; isPlayer: boolean }) {
  const transparentSrc = useTransparentPortrait(unit.portraitUrl || null);
  const fallbackEmoji = isPlayer ? '🧙' : '👹';

  if (transparentSrc) {
    return (
      <div className={`${styles.portraitImg} ${isPlayer ? styles.playerImg : styles.enemyImg}`}>
        <img src={transparentSrc} alt={unit.name} draggable={false} />
      </div>
    );
  }

  // 无立绘时用大号emoji占位
  return (
    <div className={`${styles.portraitEmoji} ${isPlayer ? styles.playerEmoji : styles.enemyEmoji}`}>
      {fallbackEmoji}
    </div>
  );
}

/* ═══════════ 角色区块（血条在头顶） ═══════════ */
function UnitBlock({ unit, isPlayer, floats, hitIds, attackAnim }: {
  unit: BattleUnitData; isPlayer: boolean;
  floats: FloatingNumber[]; hitIds: Set<string>; attackAnim: string | null;
}) {
  const hpPct = unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0;
  const mpPct = unit.maxMp > 0 ? (unit.mp / unit.maxMp) * 100 : 0;
  const hpClass = hpPct > 50 ? styles.hpHigh : hpPct > 20 ? styles.hpMid : styles.hpLow;
  const isHit = hitIds.has(unit.unitId);
  const isAttacking = attackAnim === unit.unitId;
  const myFloats = floats.filter(f => f.unitId === unit.unitId);

  const slotCls = [
    styles.unitSlot,
    unit.hp <= 0 && styles.dead,
    unit.defending && styles.defending,
    isHit && styles.hit,
    isAttacking && (isPlayer ? styles.attackUp : styles.attackDown),
  ].filter(Boolean).join(' ');

  return (
    <div className={slotCls}>
      {/* 头顶：名字 + HP/MP 条 */}
      <div className={styles.headBar}>
        <div className={styles.unitName}>{unit.name}</div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${hpClass}`} style={{ width: `${hpPct}%` }} />
        </div>
        {unit.maxMp > 0 && (
          <div className={`${styles.barTrack} ${styles.mpTrack}`}>
            <div className={`${styles.barFill} ${styles.mp}`} style={{ width: `${mpPct}%` }} />
          </div>
        )}
      </div>
      {/* 立绘 */}
      <PortraitImage unit={unit} isPlayer={isPlayer} />
      {/* 浮动数字 */}
      {myFloats.map(f => (
        <span key={f.id} className={`${styles.floatNumber} ${f.isHeal ? styles.heal : styles.damage}`}>
          {f.isHeal ? '+' : '-'}{f.value}
        </span>
      ))}
    </div>
  );
}

/* ═══════════ 主战斗页面 ═══════════ */
export default function BattlePage() {
  const { navigateTo, pageParams, previousPage } = useGameStore();
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [logs, setLogs] = useState<BattleActionData[]>([]);
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const [hitIds, setHitIds] = useState<Set<string>>(new Set());
  const [attackAnim, setAttackAnim] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const autoRef = useRef(false);
  const battleRef = useRef<BattleData | null>(null);

  // Phaser 引擎
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = usePhaserGame(phaserRef, [BattleScene]);

  const getScene = useCallback((): BattleScene | null => {
    const game = gameRef.current;
    if (!game) return null;
    return game.scene.getScene('BattleScene') as BattleScene | null;
  }, [gameRef]);

  useEffect(() => { autoRef.current = autoMode; }, [autoMode]);
  useEffect(() => { battleRef.current = battle; }, [battle]);

  const exploreEventId = pageParams?.exploreEventId as string | undefined;

  /* ── 加载已有战斗 ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBattleState();
      if (res.battle?.id) {
        setBattle(res.battle);
        setLogs(res.battle.actionLog || []);
      }
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── 发起新战斗 ── */
  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const person = await fetchPersonInfo();
      const bp = person.basicProperty || {
        hp: 100, mp: 50, physicsAttack: 15, physicsDefense: 8,
        magicAttack: 12, magicDefense: 8, speed: 10,
      };
      const res = await startBattle(bp);
      setBattle(res.battle);
      setLogs([]);
      setFloats([]);
      setAutoMode(false);
      toast.info('战斗开始！');
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  /* ── 播放特效（CSS + Phaser） ── */
  const playEffects = useCallback((actions: BattleActionData[], allUnits: BattleUnitData[]) => {
    const newFloats: FloatingNumber[] = [];
    const newHits = new Set<string>();
    const scene = getScene();
    const { width = 400, height = 700 } = gameRef.current?.scale ?? {};

    for (const a of actions) {
      const target = allUnits.find(u => u.name === a.targetName);
      const actor = allUnits.find(u => u.name === a.actorName);
      if (!target) continue;

      // 目标位置估算（敌方在上半，我方在下半）
      const isTargetEnemy = target.unitType === 'MONSTER';
      const tx = width * 0.5;
      const ty = isTargetEnemy ? height * 0.28 : height * 0.68;

      if (a.damage > 0) {
        newFloats.push({ id: ++seqId, unitId: target.unitId, value: a.damage, isHeal: false });
        newHits.add(target.unitId);
        if (scene) {
          if (a.actionType === 'SKILL' || a.skillName) {
            scene.playMagic(tx, ty);
          } else {
            scene.playSlash(tx, ty);
          }
        }
      }
      if (a.heal > 0) {
        newFloats.push({ id: ++seqId, unitId: target.unitId, value: a.heal, isHeal: true });
        if (scene) scene.playHeal(tx, ty);
      }
      if (a.actionType === 'DEFEND') {
        const ax = width * 0.5;
        const ay = actor?.unitType === 'MONSTER' ? height * 0.28 : height * 0.68;
        if (scene) scene.playShield(ax, ay);
      }

      // 攻击者动画
      if (actor && a.actionType !== 'DEFEND') {
        setAttackAnim(actor.unitId);
        setTimeout(() => setAttackAnim(null), 500);
      }
    }

    if (newFloats.length > 0) {
      setFloats(newFloats);
      setTimeout(() => setFloats([]), 1200);
    }
    if (newHits.size > 0) {
      setHitIds(newHits);
      setTimeout(() => setHitIds(new Set()), 400);
      getScene()?.flashHit();
    }
  }, [getScene, gameRef]);

  /* ── 执行技能行动 ── */
  const handleSkillAction = useCallback(async (skill: BattleSkillData) => {
    const b = battleRef.current;
    if (!b || b.status !== 'ONGOING' || acting) return;
    setActing(true);
    try {
      const target = b.enemyUnits.find(u => u.hp > 0);
      let actionType = 'ATTACK';
      if (skill.effectType === 'buff_defense') actionType = 'DEFEND';
      else if (skill.skillId !== 'attack') actionType = 'SKILL';

      const res = await battleAction(actionType, target?.unitId, skill.skillId);
      setBattle(res.battle);

      const newActions = res.battle.actionLog || [];
      setLogs(prev => [...prev, ...newActions]);

      const allUnits = [...(res.battle.playerUnits || []), ...(res.battle.enemyUnits || [])];
      playEffects(newActions, allUnits);

      if (res.battle.status === 'VICTORY') {
        toast.reward('战斗胜利！');
        setAutoMode(false);
        getScene()?.flashVictory();
        fetchPlayerCurrency().then(c => {
          usePlayerStore.getState().setCurrency(c.gold, c.diamond);
        }).catch(() => {});
      } else if (res.battle.status === 'DEFEAT') {
        toast.error('战斗失败...');
        setAutoMode(false);
      }
    } catch { /* noop */ }
    setActing(false);
  }, [acting, playEffects, getScene]);

  /* ── 自动战斗 ── */
  useEffect(() => {
    if (!autoMode) return;
    const timer = setInterval(() => {
      const b = battleRef.current;
      if (!autoRef.current || !b || b.status !== 'ONGOING') {
        clearInterval(timer);
        return;
      }
      const player = b.playerUnits[0];
      const skills = b.availableSkills || [];
      const usable = skills
        .filter(s => s.skillId !== 'attack' && s.effectType !== 'buff_defense' && (!s.mpCost || (player && player.mp >= s.mpCost)))
        .sort((a, b) => (b.damageMultiplier || 0) - (a.damageMultiplier || 0));
      const pick = usable[0] || skills.find(s => s.skillId === 'attack') || skills[0];
      if (pick) handleSkillAction(pick);
    }, 1500);
    return () => clearInterval(timer);
  }, [autoMode, handleSkillAction]);

  const finished = battle?.status === 'VICTORY' || battle?.status === 'DEFEAT';

  /* ── 返回 ── */
  const handleBack = useCallback(() => {
    if (exploreEventId) {
      navigateTo('explore', finished ? { resolvedBattleEventId: exploreEventId } : {});
    } else {
      navigateTo(previousPage || 'home');
    }
  }, [navigateTo, previousPage, exploreEventId, finished]);

  const player = battle?.playerUnits[0];

  /* ═══════════ 渲染 ═══════════ */
  return (
    <div className={styles.page}>
      {/* Phaser 特效层（透明覆盖整个页面） */}
      <div ref={phaserRef} className={styles.phaserLayer} />

      {loading ? (
        <div className={styles.loadingState}>加载中...</div>
      ) : !battle?.id ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚔️</span>
          <span className={styles.emptyTitle}>准备迎战</span>
          <span className={styles.emptyHint}>以你的角色属性挑战随机敌人</span>
          <button className={styles.startBtn} onClick={handleStart}>开始战斗</button>
        </div>
      ) : (
        <>
          {/* 战斗场景 */}
          <div className={styles.battleScene}>
            {/* 顶部信息栏 */}
            <div className={styles.topBar}>
              <button className={styles.backBtn} onClick={handleBack}>← 退出</button>
              <span className={styles.roundBadge}>第 {battle.round} 回合</span>
              {autoMode && <span className={styles.autoBadge}>自动战斗中</span>}
            </div>

            {/* 敌方区域 — 上半 */}
            <div className={styles.enemyZone}>
              <div className={styles.unitsRow}>
                {battle.enemyUnits.map(u => (
                  <UnitBlock key={u.unitId} unit={u} isPlayer={false}
                    floats={floats} hitIds={hitIds} attackAnim={attackAnim} />
                ))}
              </div>
            </div>

            {/* 战斗日志（仅最新一条） */}
            {logs.length > 0 && (
              <div className={styles.logTicker}>
                <div className={styles.logLine}>{logs[logs.length - 1].description}</div>
              </div>
            )}

            {/* 我方区域 — 下半 */}
            <div className={styles.playerZone}>
              <div className={styles.unitsRow}>
                {battle.playerUnits.map(u => (
                  <UnitBlock key={u.unitId} unit={u} isPlayer={true}
                    floats={floats} hitIds={hitIds} attackAnim={attackAnim} />
                ))}
              </div>
            </div>
          </div>

          {/* 底部操作面板 */}
          {!finished && (
            <div className={styles.actionPanel}>
              <div className={styles.skillRow}>
                {(battle.availableSkills || []).map(skill => {
                  const mpOk = !skill.mpCost || (player && player.mp >= skill.mpCost);
                  return (
                    <button key={skill.skillId} className={styles.skillBtn}
                      disabled={acting || !mpOk || autoMode}
                      onClick={() => handleSkillAction(skill)}
                    >
                      <SkillTooltip skill={skill} />
                      {skill.damageMultiplier > 1 && <span className={styles.skillMult}>{skill.damageMultiplier}x</span>}
                      {skill.mpCost > 0 && <span className={styles.skillCost}>{skill.mpCost}</span>}
                      <span className={styles.skillIcon}>{skill.icon}</span>
                      <span className={styles.skillName}>{skill.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className={styles.bottomRow}>
                <button className={`${styles.autoBtn} ${autoMode ? styles.active : ''}`}
                  onClick={() => setAutoMode(v => !v)}
                >
                  {autoMode ? '⏸ 停止自动' : '▶ 自动战斗'}
                </button>
                <button className={styles.fleeBtn} onClick={handleBack}>逃跑</button>
              </div>
            </div>
          )}

          {/* 结算遮罩 */}
          {finished && (
            <div className={`${styles.resultOverlay} ${battle.status === 'VICTORY' ? styles.victory : styles.defeat}`}>
              <div className={styles.resultIcon}>{battle.status === 'VICTORY' ? '🏆' : '💀'}</div>
              <div className={`${styles.resultTitle} ${battle.status === 'VICTORY' ? styles.victory : styles.defeat}`}>
                {battle.status === 'VICTORY' ? '战 斗 胜 利' : '战 斗 失 败'}
              </div>
              {battle.rewardDetail && (
                <div className={styles.rewardList}>
                  {battle.rewardDetail.gold != null && battle.rewardDetail.gold > 0 && (
                    <div className={styles.rewardItem}>
                      <span className={styles.rewardIcon}>💰</span>
                      <span className={styles.rewardValue}>+{battle.rewardDetail.gold}</span>
                      <span className={styles.rewardLabel}>金币</span>
                    </div>
                  )}
                  {battle.rewardDetail.exp != null && battle.rewardDetail.exp > 0 && (
                    <div className={styles.rewardItem}>
                      <span className={styles.rewardIcon}>✨</span>
                      <span className={styles.rewardValue}>+{battle.rewardDetail.exp}</span>
                      <span className={styles.rewardLabel}>经验</span>
                    </div>
                  )}
                  {battle.rewardDetail.dropItem && (
                    <div className={styles.rewardItem}>
                      <span className={styles.rewardIcon}>{battle.rewardDetail.dropIcon || '📦'}</span>
                      <span className={styles.rewardValue}>{battle.rewardDetail.dropItem}</span>
                      <span className={styles.rewardLabel}>掉落</span>
                    </div>
                  )}
                </div>
              )}
              <div className={styles.resultActions}>
                <button className={styles.btnGold} onClick={handleStart}>再战一场</button>
                <button className={styles.btnGhost} onClick={handleBack}>返回</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
