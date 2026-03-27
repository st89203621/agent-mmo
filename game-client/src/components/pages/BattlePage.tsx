import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { usePhaserGame } from '../../phaser/usePhaserGame';
import BattleScene from '../../phaser/BattleScene';
import { useTransparentPortrait } from '../../hooks/useTransparentPortrait';
import {
  startBattle, getBattleState, battleAction, fetchPersonInfo, fetchPlayerCurrency,
  fetchBagItems, useBagItem,
  type BattleData, type BattleUnitData, type BattleActionData, type BattleSkillData, type BagItemData,
} from '../../services/api';
import styles from './BattlePage.module.css';

/* ── 快捷栏类型 ── */
type HotkeyBinding =
  | { type: 'skill'; data: BattleSkillData }
  | { type: 'item'; data: BagItemData }
  | null;

const ACTION_DELAY = 700;
const HOTKEY_KEYS = ['1', '2', '3', '4', '5', '6'] as const;
const CONSUMABLE_CATEGORIES = ['consumable', 'potion', '药品', '消耗品'];

let seqId = 0;
interface FloatingNumber { id: number; unitId: string; value: number; isHeal: boolean }

/* ── 将一个action的伤害/治疗应用到单位列表的深拷贝上 ── */
function applyAction(
  players: BattleUnitData[], enemies: BattleUnitData[], action: BattleActionData,
): { players: BattleUnitData[]; enemies: BattleUnitData[] } {
  const ps = players.map(u => ({ ...u }));
  const es = enemies.map(u => ({ ...u }));
  const all = [...ps, ...es];

  if (action.damage > 0 && action.targetId) {
    const t = all.find(u => u.unitId === action.targetId);
    if (t) t.hp = Math.max(0, t.hp - action.damage);
  }
  if (action.heal > 0) {
    // 治疗目标是施术者自己
    const healId = action.effectType === 'heal' ? action.actorId : action.targetId;
    const t = all.find(u => u.unitId === healId);
    if (t) t.hp = Math.min(t.maxHp, t.hp + action.heal);
  }
  if (action.actionType === 'DEFEND') {
    const a = all.find(u => u.unitId === action.actorId);
    if (a) a.defending = true;
  }
  return { players: ps, enemies: es };
}

/* ═══════════ 立绘组件 ═══════════ */
function PortraitImage({ unit, isPlayer }: { unit: BattleUnitData; isPlayer: boolean }) {
  const transparentSrc = useTransparentPortrait(unit.portraitUrl || null);
  if (transparentSrc) {
    return (
      <div className={`${styles.portraitImg} ${isPlayer ? styles.playerImg : styles.enemyImg}`}>
        <img src={transparentSrc} alt={unit.name} draggable={false} />
      </div>
    );
  }
  return (
    <div className={`${styles.portraitEmoji} ${isPlayer ? styles.playerEmoji : styles.enemyEmoji}`}>
      {isPlayer ? '🧙' : '👹'}
    </div>
  );
}

const GRADE_STYLE: Record<string, { label: string; color: string }> = {
  C: { label: 'C', color: '#9e9e9e' }, B: { label: 'B', color: '#4caf50' },
  A: { label: 'A', color: '#2196f3' }, S: { label: 'S', color: '#ffc107' },
  SS: { label: 'SS', color: '#ff9800' }, SSS: { label: 'SSS', color: '#e91e63' },
};

/* ═══════════ 角色区块 ═══════════ */
function UnitBlock({ unit, isPlayer, floats, hitIds, attackAnim }: {
  unit: BattleUnitData; isPlayer: boolean;
  floats: FloatingNumber[]; hitIds: Set<string>; attackAnim: string | null;
}) {
  const hpPct = unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0;
  const mpPct = unit.maxMp > 0 ? (unit.mp / unit.maxMp) * 100 : 0;
  const atbPct = Math.min(100, unit.actionGauge ?? 0);
  const hpClass = hpPct > 50 ? styles.hpHigh : hpPct > 20 ? styles.hpMid : styles.hpLow;
  const isHit = hitIds.has(unit.unitId);
  const isAttacking = attackAnim === unit.unitId;
  const myFloats = floats.filter(f => f.unitId === unit.unitId);
  const gradeInfo = !isPlayer && unit.grade ? GRADE_STYLE[unit.grade] : null;

  const slotCls = [
    styles.unitSlot,
    unit.hp <= 0 && styles.dead,
    unit.defending && styles.defending,
    isHit && styles.hit,
    isAttacking && (isPlayer ? styles.attackUp : styles.attackDown),
  ].filter(Boolean).join(' ');

  return (
    <div className={slotCls}>
      <div className={styles.headBar}>
        <div className={styles.unitName}>
          {gradeInfo && (
            <span className={styles.gradeBadge} style={{ color: gradeInfo.color, borderColor: gradeInfo.color }}>
              {gradeInfo.label}
            </span>
          )}
          {unit.name}
        </div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${hpClass}`} style={{ width: `${hpPct}%` }} />
        </div>
        <div className={styles.hpText}>{unit.hp}/{unit.maxHp}</div>
        {unit.maxMp > 0 && (
          <div className={`${styles.barTrack} ${styles.mpTrack}`}>
            <div className={`${styles.barFill} ${styles.mp}`} style={{ width: `${mpPct}%` }} />
          </div>
        )}
        <div className={`${styles.barTrack} ${styles.atbTrack}`}>
          <div className={`${styles.barFill} ${styles.atb}`} style={{ width: `${atbPct}%` }} />
        </div>
      </div>
      <PortraitImage unit={unit} isPlayer={isPlayer} />
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
  // 用于动画期间逐步展示的中间状态
  const [displayPlayers, setDisplayPlayers] = useState<BattleUnitData[]>([]);
  const [displayEnemies, setDisplayEnemies] = useState<BattleUnitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentLog, setCurrentLog] = useState<BattleActionData | null>(null);
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const [hitIds, setHitIds] = useState<Set<string>>(new Set());
  const [attackAnim, setAttackAnim] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  // 快捷栏（技能+道具统一）
  const [bagItems, setBagItems] = useState<BagItemData[]>([]);
  const [hotkeys, setHotkeys] = useState<HotkeyBinding[]>(HOTKEY_KEYS.map(() => null));
  const [showBindPanel, setShowBindPanel] = useState(false);
  const [bindSlot, setBindSlot] = useState<number>(0);
  const [bindTab, setBindTab] = useState<'skill' | 'item'>('skill');

  const autoRef = useRef(false);
  const battleRef = useRef<BattleData | null>(null);
  const playingRef = useRef(false);

  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = usePhaserGame(phaserRef, [BattleScene]);

  const getScene = useCallback((): BattleScene | null => {
    return gameRef.current?.scene.getScene('BattleScene') as BattleScene | null;
  }, [gameRef]);

  useEffect(() => { autoRef.current = autoMode; }, [autoMode]);
  useEffect(() => { battleRef.current = battle; }, [battle]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  // battle 变化时同步 display 状态（非动画期间）
  useEffect(() => {
    if (battle && !playingRef.current) {
      setDisplayPlayers(battle.playerUnits);
      setDisplayEnemies(battle.enemyUnits);
    }
  }, [battle]);

  const exploreEventId = pageParams?.exploreEventId as string | undefined;
  const dungeonId = pageParams?.dungeonId as string | undefined;
  const isDungeonBattle = pageParams?.dungeonBattle as boolean | undefined;

  const loadBagItems = useCallback(async () => {
    try {
      const res = await fetchBagItems();
      setBagItems((res.items || []).filter(
        item => item.category && CONSUMABLE_CATEGORIES.includes(item.category)
      ));
    } catch { /* noop */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [battleRes, personRes] = await Promise.all([getBattleState(), fetchPersonInfo(), loadBagItems()]);
      if (battleRes.battle?.id) {
        setBattle(battleRes.battle);
        setDisplayPlayers(battleRes.battle.playerUnits);
        setDisplayEnemies(battleRes.battle.enemyUnits);
      }
      if (personRes.bgUrl) setBgUrl(personRes.bgUrl);
    } catch { /* noop */ }
    setLoading(false);
  }, [loadBagItems]);

  useEffect(() => { load(); }, [load]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await startBattle();
      setBattle(res.battle);
      setFloats([]);
      setAutoMode(false);
      setCurrentLog(null);
      toast.info('战斗开始！');
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  /* ── 逐个播放行动，每个行动后更新血条 ── */
  const playActionsSequentially = useCallback(async (
    actions: BattleActionData[],
    startPlayers: BattleUnitData[],
    startEnemies: BattleUnitData[],
  ) => {
    if (actions.length === 0) return;
    setPlaying(true);
    playingRef.current = true;

    const scene = getScene();
    const { width = 400, height = 700 } = gameRef.current?.scale ?? {};

    let curPlayers = startPlayers.map(u => ({ ...u }));
    let curEnemies = startEnemies.map(u => ({ ...u }));

    for (const a of actions) {
      setCurrentLog(a);

      const allUnits = [...curPlayers, ...curEnemies];
      const target = allUnits.find(u => u.unitId === a.targetId) || allUnits.find(u => u.name === a.targetName);
      const actor = allUnits.find(u => u.unitId === a.actorId) || allUnits.find(u => u.name === a.actorName);

      // Phaser 特效位置
      const isTargetEnemy = target?.unitType === 'MONSTER';
      const tx = width * 0.5;
      const ty = isTargetEnemy ? height * 0.22 : height * 0.68;

      // 攻击者冲锋
      if (actor && a.actionType !== 'DEFEND') {
        setAttackAnim(actor.unitId);
      }

      // 播放特效
      if (scene) {
        if (a.damage > 0) {
          const et = a.effectType || (a.actionType === 'SKILL' ? 'magic_damage' : 'physical_damage');
          scene.playEffect(et, tx, ty);
        }
        if (a.heal > 0) {
          const healId = a.effectType === 'heal' ? a.actorId : a.targetId;
          const healUnit = allUnits.find(u => u.unitId === healId);
          const isHealEnemy = healUnit?.unitType === 'MONSTER';
          scene.playHeal(width * 0.5, isHealEnemy ? height * 0.22 : height * 0.68);
        }
        if (a.actionType === 'DEFEND' && actor) {
          const ay = actor.unitType === 'MONSTER' ? height * 0.22 : height * 0.68;
          scene.playShield(width * 0.5, ay);
        }
      }

      // 浮动数字
      const newFloats: FloatingNumber[] = [];
      if (a.damage > 0 && target) {
        newFloats.push({ id: ++seqId, unitId: target.unitId, value: a.damage, isHeal: false });
        setHitIds(new Set([target.unitId]));
        scene?.flashHit();
      }
      if (a.heal > 0) {
        const healId = a.effectType === 'heal' ? (a.actorId || a.targetId) : a.targetId;
        newFloats.push({ id: ++seqId, unitId: healId, value: a.heal, isHeal: true });
      }
      if (newFloats.length > 0) setFloats(newFloats);

      // 应用此行动的伤害到中间状态 → 血条逐步更新
      const next = applyAction(curPlayers, curEnemies, a);
      curPlayers = next.players;
      curEnemies = next.enemies;

      // 延迟一点再更新血条，让特效先播
      await new Promise<void>(r => setTimeout(r, 250));
      setDisplayPlayers([...curPlayers]);
      setDisplayEnemies([...curEnemies]);

      // 等待剩余时间
      await new Promise<void>(r => setTimeout(r, ACTION_DELAY - 250));
      setAttackAnim(null);
      setHitIds(new Set());
      setFloats([]);
    }

    setCurrentLog(null);
    setPlaying(false);
    playingRef.current = false;
  }, [getScene, gameRef]);

  /* ── 执行技能行动 ── */
  const handleSkillAction = useCallback(async (skill: BattleSkillData) => {
    const b = battleRef.current;
    if (!b || b.status !== 'ONGOING' || acting || playingRef.current) return;
    setActing(true);
    try {
      const target = b.enemyUnits.find(u => u.hp > 0);
      let actionType = 'ATTACK';
      if (skill.effectType === 'buff_defense') actionType = 'DEFEND';
      else if (skill.skillId !== 'attack') actionType = 'SKILL';

      // 记住动画前的状态
      const prevPlayers = b.playerUnits.map(u => ({ ...u }));
      const prevEnemies = b.enemyUnits.map(u => ({ ...u }));

      const res = await battleAction(actionType, target?.unitId, skill.skillId);
      const newBattle = res.battle;
      const newActions = newBattle.actionLog || [];

      // 用旧状态作为起点，逐步播放
      await playActionsSequentially(newActions, prevPlayers, prevEnemies);

      // 播放完毕同步最终状态
      setBattle(newBattle);
      setDisplayPlayers(newBattle.playerUnits);
      setDisplayEnemies(newBattle.enemyUnits);

      if (newBattle.status === 'VICTORY') {
        toast.reward('战斗胜利！');
        setAutoMode(false);
        getScene()?.flashVictory();
        fetchPlayerCurrency().then(c => {
          usePlayerStore.getState().setCurrency(c.gold, c.diamond);
        }).catch(() => {});
        // 从 rewardDetail 立即更新等级（无需额外请求）
        if (newBattle.rewardDetail?.currentLevel != null) {
          usePlayerStore.getState().setLevelInfo({
            level: newBattle.rewardDetail.currentLevel,
            exp: newBattle.rewardDetail.currentExp ?? 0,
            maxExp: newBattle.rewardDetail.maxExp ?? 0,
          });
        }
      } else if (newBattle.status === 'DEFEAT') {
        toast.error('战斗失败...');
        setAutoMode(false);
      }
    } catch { /* noop */ }
    setActing(false);
  }, [acting, playActionsSequentially, getScene]);

  /* ── 使用道具 ── */
  const handleUseItem = useCallback(async (item: BagItemData) => {
    const b = battleRef.current;
    if (!b || b.status !== 'ONGOING' || acting || playingRef.current) return;
    try {
      await useBagItem(item.id, item.itemTypeId, 1);
      toast.info(`使用了 ${item.name || item.itemTypeId}`);
      const [battleRes] = await Promise.all([getBattleState(), loadBagItems()]);
      if (battleRes.battle?.id) setBattle(battleRes.battle);
    } catch {
      toast.error('使用失败');
    }
  }, [acting, loadBagItems]);

  /* ── 快捷键触发 ── */
  const triggerHotkey = useCallback((binding: HotkeyBinding) => {
    if (!binding) return;
    if (binding.type === 'skill') handleSkillAction(binding.data);
    else handleUseItem(binding.data);
  }, [handleSkillAction, handleUseItem]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const idx = HOTKEY_KEYS.indexOf(e.key as typeof HOTKEY_KEYS[number]);
      if (idx !== -1 && hotkeys[idx]) {
        e.preventDefault();
        triggerHotkey(hotkeys[idx]);
        return;
      }
      if (e.key === 'q' || e.key === 'Q') setAutoMode(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hotkeys, triggerHotkey]);

  /* ── 自动战斗 ── */
  useEffect(() => {
    if (!autoMode) return;
    const timer = setInterval(() => {
      const b = battleRef.current;
      if (!autoRef.current || !b || b.status !== 'ONGOING' || playingRef.current) {
        if (!autoRef.current || b?.status !== 'ONGOING') clearInterval(timer);
        return;
      }
      const player = b.playerUnits[0];
      const skills = b.availableSkills || [];
      const usable = skills
        .filter(s => s.skillId !== 'attack' && s.effectType !== 'buff_defense' && (!s.mpCost || (player && player.mp >= s.mpCost)))
        .sort((a, b) => (b.damageMultiplier || 0) - (a.damageMultiplier || 0));
      const pick = usable[0] || skills.find(s => s.skillId === 'attack') || skills[0];
      if (pick) handleSkillAction(pick);
    }, 1800);
    return () => clearInterval(timer);
  }, [autoMode, handleSkillAction]);

  const finished = battle?.status === 'VICTORY' || battle?.status === 'DEFEAT';
  const player = displayPlayers[0];
  const canAct = !acting && !playing && !autoMode && !finished;
  const skills = battle?.availableSkills || [];

  const handleBack = useCallback(() => {
    if (isDungeonBattle && dungeonId) {
      navigateTo('dungeon', finished ? { battleResult: battle?.status, dungeonId } : {});
    } else if (exploreEventId) {
      navigateTo('explore', finished ? { resolvedBattleEventId: exploreEventId } : {});
    } else {
      navigateTo(previousPage || 'home');
    }
  }, [navigateTo, previousPage, exploreEventId, isDungeonBattle, dungeonId, finished, battle?.status]);

  /* ── 绑定快捷键 ── */
  const openBind = (slot: number) => {
    setBindSlot(slot);
    setBindTab('skill');
    setShowBindPanel(true);
  };

  const bindTo = (binding: HotkeyBinding) => {
    setHotkeys(prev => {
      const next = [...prev];
      next[bindSlot] = binding;
      return next;
    });
    setShowBindPanel(false);
    const label = binding?.type === 'skill' ? binding.data.name : binding?.data.name;
    toast.info(`快捷键 ${HOTKEY_KEYS[bindSlot]} → ${label}`);
  };

  /* ═══════════ 渲染 ═══════════ */
  return (
    <div className={styles.page}>
      {bgUrl && <div className={styles.battleBg} style={{ backgroundImage: `url(${bgUrl})` }} />}
      <div className={styles.bgOverlay} />
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
          <div className={styles.battleScene}>
            {/* 顶部 HUD */}
            <div className={styles.hud}>
              <button className={styles.exitBtn} onClick={handleBack}>✕</button>
              <div className={styles.roundPill}>
                <span>第 {battle.round} 回合</span>
                {autoMode && <span className={styles.autoTag}>AUTO</span>}
              </div>
              <div className={styles.hudSpacer} />
            </div>

            {/* 敌方 */}
            <div className={styles.enemyZone}>
              {displayEnemies.map(u => (
                <UnitBlock key={u.unitId} unit={u} isPlayer={false}
                  floats={floats} hitIds={hitIds} attackAnim={attackAnim} />
              ))}
            </div>

            {/* 分隔线区域 + 战斗日志 */}
            <div className={styles.midSection}>
              <div className={styles.dividerLine} />
              {currentLog && (
                <div className={`${styles.logBubble} ${currentLog.actorName === '玩家' ? styles.logPlayer : styles.logEnemy}`}>
                  {currentLog.description}
                </div>
              )}
            </div>

            {/* 我方 */}
            <div className={styles.playerZone}>
              {displayPlayers.map(u => (
                <UnitBlock key={u.unitId} unit={u} isPlayer={true}
                  floats={floats} hitIds={hitIds} attackAnim={attackAnim} />
              ))}
            </div>
          </div>

          {/* 底部操作区 */}
          {!finished && (
            <div className={styles.actionBar}>
              {/* 快捷栏（6格，可绑定技能或道具） */}
              <div className={styles.hotkeyBar}>
                {hotkeys.map((bind, idx) => (
                  <button
                    key={idx}
                    className={`${styles.hotkeySlot} ${bind ? styles.bound : ''} ${bind?.type === 'skill' ? styles.boundSkill : ''}`}
                    disabled={!canAct && !!bind}
                    onClick={() => {
                      if (bind && canAct) triggerHotkey(bind);
                      else openBind(idx);
                    }}
                  >
                    <span className={styles.hotkeyKey}>{HOTKEY_KEYS[idx]}</span>
                    {bind ? (
                      <>
                        <span className={styles.hotkeyIcon}>
                          {bind.type === 'skill' ? bind.data.icon : (bind.data.icon || '🧪')}
                        </span>
                        <span className={styles.hotkeyLabel}>
                          {bind.type === 'skill' ? bind.data.name : bind.data.name}
                        </span>
                        {bind.type === 'item' && <span className={styles.hotkeyQty}>x{bind.data.quantity}</span>}
                      </>
                    ) : (
                      <span className={styles.hotkeyPlus}>+</span>
                    )}
                  </button>
                ))}
              </div>

              {/* 技能列表 */}
              <div className={styles.skillBar}>
                {skills.map(skill => {
                  const mpOk = !skill.mpCost || (player && player.mp >= skill.mpCost);
                  return (
                    <button key={skill.skillId} className={styles.skillBtn}
                      disabled={!canAct || !mpOk}
                      onClick={() => handleSkillAction(skill)}
                    >
                      <span className={styles.skillIcon}>{skill.icon}</span>
                      <span className={styles.skillName}>{skill.name}</span>
                      {skill.mpCost > 0 && <span className={styles.skillCost}>{skill.mpCost}</span>}
                      {skill.damageMultiplier > 1 && <span className={styles.skillMult}>{skill.damageMultiplier}x</span>}
                    </button>
                  );
                })}
                <div className={styles.actionDivider} />
                <button className={`${styles.ctrlBtn} ${autoMode ? styles.ctrlActive : ''}`}
                  onClick={() => setAutoMode(v => !v)}>
                  {autoMode ? '⏸' : '▶'} <span className={styles.ctrlLabel}>自动</span>
                </button>
                <button className={styles.ctrlBtn} onClick={handleBack}>
                  🏃 <span className={styles.ctrlLabel}>逃跑</span>
                </button>
              </div>
            </div>
          )}

          {/* 绑定面板 */}
          {showBindPanel && (
            <div className={styles.bindOverlay} onClick={() => setShowBindPanel(false)}>
              <div className={styles.bindPanel} onClick={e => e.stopPropagation()}>
                <div className={styles.bindTitle}>设置快捷键 {HOTKEY_KEYS[bindSlot]}</div>
                <div className={styles.bindTabs}>
                  <button className={`${styles.bindTab} ${bindTab === 'skill' ? styles.bindTabActive : ''}`}
                    onClick={() => setBindTab('skill')}>技能</button>
                  <button className={`${styles.bindTab} ${bindTab === 'item' ? styles.bindTabActive : ''}`}
                    onClick={() => setBindTab('item')}>道具</button>
                </div>
                <div className={styles.bindGrid}>
                  {bindTab === 'skill' ? (
                    skills.length === 0 ? <div className={styles.bindEmpty}>暂无技能</div> :
                    skills.map(s => (
                      <button key={s.skillId} className={styles.bindCard}
                        onClick={() => bindTo({ type: 'skill', data: s })}>
                        <span className={styles.bindCardIcon}>{s.icon}</span>
                        <span className={styles.bindCardName}>{s.name}</span>
                        {s.mpCost > 0 && <span className={styles.bindCardSub}>{s.mpCost} MP</span>}
                      </button>
                    ))
                  ) : (
                    bagItems.length === 0 ? <div className={styles.bindEmpty}>没有消耗品</div> :
                    bagItems.map(item => (
                      <button key={item.id} className={styles.bindCard}
                        onClick={() => bindTo({ type: 'item', data: item })}>
                        <span className={styles.bindCardIcon}>{item.icon || '🧪'}</span>
                        <span className={styles.bindCardName}>{item.name || item.itemTypeId}</span>
                        <span className={styles.bindCardSub}>x{item.quantity}</span>
                      </button>
                    ))
                  )}
                </div>
                {hotkeys[bindSlot] && (
                  <button className={styles.bindClear}
                    onClick={() => { bindTo(null); }}>
                    清除绑定
                  </button>
                )}
                <button className={styles.bindClose} onClick={() => setShowBindPanel(false)}>取消</button>
              </div>
            </div>
          )}

          {/* 结算 */}
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
                  {battle.rewardDetail.equipDrop && (
                    <div className={styles.rewardItem}>
                      <span className={styles.rewardIcon}>{battle.rewardDetail.equipDropIcon || '⚔️'}</span>
                      <span className={styles.rewardValue}>{battle.rewardDetail.equipDrop}</span>
                      <span className={styles.rewardLabel}>装备掉落</span>
                    </div>
                  )}
                  {battle.rewardDetail.currentLevel != null && (
                    <div className={styles.levelProgress}>
                      <span className={styles.levelTag}>Lv.{battle.rewardDetail.currentLevel}</span>
                      <div className={styles.expTrack}>
                        <div
                          className={styles.expTrackFill}
                          style={{
                            width: `${battle.rewardDetail.maxExp && battle.rewardDetail.maxExp > 0
                              ? Math.min(100, (battle.rewardDetail.currentExp! / battle.rewardDetail.maxExp) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className={styles.expTrackText}>
                        {battle.rewardDetail.currentExp}/{battle.rewardDetail.maxExp}
                      </span>
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
