import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { usePhaserGame } from '../../phaser/usePhaserGame';
import BattleScene from '../../phaser/BattleScene';
import { useTransparentPortrait } from '../../hooks/useTransparentPortrait';
import {
  battleAction,
  fetchBagItems,
  fetchPersonInfo,
  fetchPlayerCurrency,
  getBattleState,
  startBattle,
  useBagItem,
  type BagItemData,
  type BattleActionData,
  type BattleData,
  type BattleSkillData,
  type BattleUnitData,
} from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';

type HotkeyBinding =
  | { type: 'skill'; data: BattleSkillData }
  | { type: 'item'; data: BagItemData }
  | null;

interface FloatingNumber {
  id: number;
  unitId: string;
  value: number;
  isHeal: boolean;
}

const ACTION_DELAY = 700;
const HOTKEY_KEYS = ['1', '2', '3', '4', '5', '6'] as const;
const CONSUMABLE_CATEGORIES = ['consumable', 'potion', '药品', '消耗品'];
const BAR_SEGMENTS = 10;

let seqId = 0;

function applyAction(
  players: BattleUnitData[],
  enemies: BattleUnitData[],
  action: BattleActionData,
): { players: BattleUnitData[]; enemies: BattleUnitData[] } {
  const nextPlayers = players.map(unit => ({ ...unit }));
  const nextEnemies = enemies.map(unit => ({ ...unit }));
  const allUnits = [...nextPlayers, ...nextEnemies];

  if (action.damage > 0 && action.targetId) {
    const target = allUnits.find(unit => unit.unitId === action.targetId);
    if (target) target.hp = Math.max(0, target.hp - action.damage);
  }

  if (action.heal > 0) {
    const healId = action.effectType === 'heal' ? action.actorId : action.targetId;
    const target = allUnits.find(unit => unit.unitId === healId);
    if (target) target.hp = Math.min(target.maxHp, target.hp + action.heal);
  }

  if (action.actionType === 'DEFEND') {
    const actor = allUnits.find(unit => unit.unitId === action.actorId);
    if (actor) actor.defending = true;
  }

  return { players: nextPlayers, enemies: nextEnemies };
}

function toSegments(value: number, max: number) {
  if (!max || max <= 0) return 0;
  return Math.max(0, Math.min(BAR_SEGMENTS, Math.round((value / max) * BAR_SEGMENTS)));
}

function logToneClass(line: string) {
  if (/miss|未命中|闪避/i.test(line)) return styles.logMiss;
  if (/暴|怒气|crit|\+/.test(line)) return styles.logCrit;
  if (/伤害|击破|治疗|heal|hit/i.test(line)) return styles.logHit;
  return '';
}

function PortraitCard({
  unit,
  enemy = false,
  floats,
}: {
  unit: BattleUnitData | null;
  enemy?: boolean;
  floats: FloatingNumber[];
}) {
  const transparentSrc = useTransparentPortrait(unit?.portraitUrl || null);

  return (
    <div className={`${styles.pf} ${enemy ? styles.pfEnemy : ''}`}>
      {transparentSrc ? (
        <img
          src={transparentSrc}
          alt={unit?.name || 'portrait'}
          className={`${styles.pfImg} ${enemy ? styles.pfImgEnemy : styles.pfImgPlayer}`}
          draggable={false}
        />
      ) : (
        <div className={styles.pfFallback}>
          {enemy ? '怪物' : '主角'}
          <br />
          {unit?.name || '未出战'}
        </div>
      )}

      {floats.map(float => (
        <span
          key={float.id}
          className={`${styles.dmgFloat} ${float.isHeal ? styles.dmgFloatHeal : styles.dmgFloatDamage}`}
        >
          {float.isHeal ? '+' : '-'}
          {float.value}
        </span>
      ))}
    </div>
  );
}

function SegmentBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: string;
  max: number;
  tone: 'hp' | 'mp' | 'rage';
}) {
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <span className={styles.barVal}>{value}</span>
      <span className={`${styles.battleBar} ${styles[`battleBar${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>
        {Array.from({ length: BAR_SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={`${styles.barSeg} ${index < max ? styles.barSegOn : ''}`}
          />
        ))}
      </span>
    </div>
  );
}

export default function BattlePage() {
  const { navigateTo, pageParams, previousPage } = useGameStore();
  const [battle, setBattle] = useState<BattleData | null>(null);
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
  const [bagItems, setBagItems] = useState<BagItemData[]>([]);
  const [hotkeys, setHotkeys] = useState<HotkeyBinding[]>(HOTKEY_KEYS.map(() => null));
  const [showBindPanel, setShowBindPanel] = useState(false);
  const [bindSlot, setBindSlot] = useState(0);
  const [bindTab, setBindTab] = useState<'skill' | 'item'>('skill');

  const autoRef = useRef(false);
  const battleRef = useRef<BattleData | null>(null);
  const playingRef = useRef(false);
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = usePhaserGame(phaserRef, [BattleScene]);

  const getScene = useCallback((): BattleScene | null => {
    return gameRef.current?.scene.getScene('BattleScene') as BattleScene | null;
  }, [gameRef]);

  useEffect(() => {
    autoRef.current = autoMode;
  }, [autoMode]);

  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

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
      const response = await fetchBagItems();
      setBagItems(
        (response.items || []).filter(
          item => item.category && CONSUMABLE_CATEGORIES.includes(item.category),
        ),
      );
    } catch {
      setBagItems([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [battleRes, personRes] = await Promise.all([
        getBattleState(),
        fetchPersonInfo(),
        loadBagItems(),
      ]);

      if (battleRes.battle?.id) {
        setBattle(battleRes.battle);
        setDisplayPlayers(battleRes.battle.playerUnits);
        setDisplayEnemies(battleRes.battle.enemyUnits);
      }

      if (personRes.bgUrl) setBgUrl(personRes.bgUrl);
    } catch {
      setBattle(null);
    } finally {
      setLoading(false);
    }
  }, [loadBagItems]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const response = await startBattle();
      setBattle(response.battle);
      setDisplayPlayers(response.battle.playerUnits);
      setDisplayEnemies(response.battle.enemyUnits);
      setFloats([]);
      setHitIds(new Set());
      setAttackAnim(null);
      setAutoMode(false);
      setCurrentLog(null);
      toast.info('战斗开始');
    } catch {
      toast.error('战斗开启失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const playActionsSequentially = useCallback(
    async (
      actions: BattleActionData[],
      startPlayers: BattleUnitData[],
      startEnemies: BattleUnitData[],
    ) => {
      if (!actions.length) return;

      setPlaying(true);
      playingRef.current = true;

      const scene = getScene();
      const { width = 400, height = 700 } = gameRef.current?.scale ?? {};
      let currentPlayers = startPlayers.map(unit => ({ ...unit }));
      let currentEnemies = startEnemies.map(unit => ({ ...unit }));

      for (const action of actions) {
        setCurrentLog(action);

        const allUnits = [...currentPlayers, ...currentEnemies];
        const target =
          allUnits.find(unit => unit.unitId === action.targetId) ||
          allUnits.find(unit => unit.name === action.targetName);
        const actor =
          allUnits.find(unit => unit.unitId === action.actorId) ||
          allUnits.find(unit => unit.name === action.actorName);

        const isTargetEnemy = target?.unitType === 'MONSTER';
        const effectX = width * 0.5;
        const effectY = isTargetEnemy ? height * 0.22 : height * 0.68;

        if (actor && action.actionType !== 'DEFEND') {
          setAttackAnim(actor.unitId);
        }

        if (scene) {
          if (action.damage > 0) {
            const effectType =
              action.effectType || (action.actionType === 'SKILL' ? 'magic_damage' : 'physical_damage');
            scene.playEffect(effectType, effectX, effectY);
          }

          if (action.heal > 0) {
            const healId = action.effectType === 'heal' ? action.actorId : action.targetId;
            const healUnit = allUnits.find(unit => unit.unitId === healId);
            const healEnemy = healUnit?.unitType === 'MONSTER';
            scene.playHeal(width * 0.5, healEnemy ? height * 0.22 : height * 0.68);
          }

          if (action.actionType === 'DEFEND' && actor) {
            const shieldY = actor.unitType === 'MONSTER' ? height * 0.22 : height * 0.68;
            scene.playShield(width * 0.5, shieldY);
          }
        }

        const nextFloats: FloatingNumber[] = [];
        if (action.damage > 0 && target) {
          nextFloats.push({
            id: ++seqId,
            unitId: target.unitId,
            value: action.damage,
            isHeal: false,
          });
          setHitIds(new Set([target.unitId]));
          scene?.flashHit();
        }

        if (action.heal > 0) {
          const healId = action.effectType === 'heal' ? action.actorId || action.targetId : action.targetId;
          nextFloats.push({
            id: ++seqId,
            unitId: healId,
            value: action.heal,
            isHeal: true,
          });
        }

        if (nextFloats.length) setFloats(nextFloats);

        const nextState = applyAction(currentPlayers, currentEnemies, action);
        currentPlayers = nextState.players;
        currentEnemies = nextState.enemies;

        await new Promise<void>(resolve => setTimeout(resolve, 250));
        setDisplayPlayers([...currentPlayers]);
        setDisplayEnemies([...currentEnemies]);

        await new Promise<void>(resolve => setTimeout(resolve, ACTION_DELAY - 250));
        setAttackAnim(null);
        setHitIds(new Set());
        setFloats([]);
      }

      setCurrentLog(null);
      setPlaying(false);
      playingRef.current = false;
    },
    [getScene, gameRef],
  );

  const handleSkillAction = useCallback(
    async (skill: BattleSkillData) => {
      const currentBattle = battleRef.current;
      if (!currentBattle || currentBattle.status !== 'ONGOING' || acting || playingRef.current) return;

      setActing(true);
      try {
        const target = currentBattle.enemyUnits.find(unit => unit.hp > 0);
        let actionType = 'ATTACK';
        if (skill.effectType === 'buff_defense') actionType = 'DEFEND';
        else if (skill.skillId !== 'attack') actionType = 'SKILL';

        const prevPlayers = currentBattle.playerUnits.map(unit => ({ ...unit }));
        const prevEnemies = currentBattle.enemyUnits.map(unit => ({ ...unit }));

        const response = await battleAction(actionType, target?.unitId, skill.skillId);
        const nextBattle = response.battle;
        const nextActions = nextBattle.actionLog || [];

        await playActionsSequentially(nextActions, prevPlayers, prevEnemies);

        setBattle(nextBattle);
        setDisplayPlayers(nextBattle.playerUnits);
        setDisplayEnemies(nextBattle.enemyUnits);

        if (nextBattle.status === 'VICTORY') {
          toast.reward('战斗胜利');
          setAutoMode(false);
          getScene()?.flashVictory();
          fetchPlayerCurrency()
            .then(currency => {
              usePlayerStore.getState().setCurrency(currency.gold, currency.diamond);
            })
            .catch(() => {});

          if (nextBattle.rewardDetail?.currentLevel != null) {
            usePlayerStore.getState().setLevelInfo({
              level: nextBattle.rewardDetail.currentLevel,
              exp: nextBattle.rewardDetail.currentExp ?? 0,
              maxExp: nextBattle.rewardDetail.maxExp ?? 0,
            });
          }
        } else if (nextBattle.status === 'DEFEAT') {
          toast.error('战斗失败');
          setAutoMode(false);
        }
      } catch {
        toast.error('出招失败');
      } finally {
        setActing(false);
      }
    },
    [acting, getScene, playActionsSequentially],
  );

  const handleUseItem = useCallback(
    async (item: BagItemData) => {
      const currentBattle = battleRef.current;
      if (!currentBattle || currentBattle.status !== 'ONGOING' || acting || playingRef.current) return;

      try {
        await useBagItem(item.id, item.itemTypeId, 1);
        toast.info(`使用了 ${item.name || item.itemTypeId}`);
        const [battleRes] = await Promise.all([getBattleState(), loadBagItems()]);
        if (battleRes.battle?.id) {
          setBattle(battleRes.battle);
          setDisplayPlayers(battleRes.battle.playerUnits);
          setDisplayEnemies(battleRes.battle.enemyUnits);
        }
      } catch {
        toast.error('使用失败');
      }
    },
    [acting, loadBagItems],
  );

  const triggerHotkey = useCallback(
    (binding: HotkeyBinding) => {
      if (!binding) return;
      if (binding.type === 'skill') handleSkillAction(binding.data);
      else handleUseItem(binding.data);
    },
    [handleSkillAction, handleUseItem],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const idx = HOTKEY_KEYS.indexOf(event.key as (typeof HOTKEY_KEYS)[number]);
      if (idx !== -1 && hotkeys[idx]) {
        event.preventDefault();
        triggerHotkey(hotkeys[idx]);
        return;
      }

      if (event.key === 'q' || event.key === 'Q') {
        setAutoMode(value => !value);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hotkeys, triggerHotkey]);

  useEffect(() => {
    if (!autoMode) return;

    const timer = setInterval(() => {
      const currentBattle = battleRef.current;
      if (!autoRef.current || !currentBattle || currentBattle.status !== 'ONGOING' || playingRef.current) {
        if (!autoRef.current || currentBattle?.status !== 'ONGOING') clearInterval(timer);
        return;
      }

      const currentPlayer = currentBattle.playerUnits[0];
      const availableSkills = currentBattle.availableSkills || [];
      const usableSkills = availableSkills
        .filter(
          skill =>
            skill.skillId !== 'attack' &&
            skill.effectType !== 'buff_defense' &&
            (!skill.mpCost || (currentPlayer && currentPlayer.mp >= skill.mpCost)),
        )
        .sort((a, b) => (b.damageMultiplier || 0) - (a.damageMultiplier || 0));

      const pick =
        usableSkills[0] ||
        availableSkills.find(skill => skill.skillId === 'attack') ||
        availableSkills[0];

      if (pick) handleSkillAction(pick);
    }, 1800);

    return () => clearInterval(timer);
  }, [autoMode, handleSkillAction]);

  const finished = battle?.status === 'VICTORY' || battle?.status === 'DEFEAT';
  const player = displayPlayers[0] || battle?.playerUnits?.[0] || null;
  const primaryEnemy = displayEnemies.find(unit => unit.hp > 0) || displayEnemies[0] || null;
  const aliveEnemyCount = displayEnemies.filter(unit => unit.hp > 0).length || displayEnemies.length || 1;
  const canAct = !acting && !playing && !finished;
  const skills = battle?.availableSkills || [];
  const visibleSkills = [...skills.slice(0, 4)];
  while (visibleSkills.length < 4) {
    visibleSkills.push({
      skillId: `locked-${visibleSkills.length}`,
      name: '终式未解锁',
      icon: '锁',
      mpCost: 0,
      damageMultiplier: 0,
      effectType: 'locked',
    } as BattleSkillData);
  }

  const quickItems = bagItems.slice(0, 2);
  const logLines = [currentLog?.description, ...(battle?.actionLog || []).map(log => log.description)]
    .filter(Boolean)
    .slice(0, 5) as string[];

  const enemyFloats = primaryEnemy ? floats.filter(float => float.unitId === primaryEnemy.unitId) : [];
  const playerFloats = player ? floats.filter(float => float.unitId === player.unitId) : [];
  const hasBoundHotkey = hotkeys.find(Boolean) || null;

  const handleBack = useCallback(() => {
    if (isDungeonBattle && dungeonId) {
      navigateTo('dungeon', finished ? { battleResult: battle?.status, dungeonId } : {});
    } else if (exploreEventId) {
      navigateTo('explore', finished ? { resolvedBattleEventId: exploreEventId } : {});
    } else {
      navigateTo(previousPage || 'home');
    }
  }, [battle?.status, dungeonId, exploreEventId, finished, isDungeonBattle, navigateTo, previousPage]);

  const openBind = useCallback((slot: number) => {
    setBindSlot(slot);
    setBindTab('skill');
    setShowBindPanel(true);
  }, []);

  const bindTo = useCallback(
    (binding: HotkeyBinding) => {
      setHotkeys(prev => {
        const next = [...prev];
        next[bindSlot] = binding;
        return next;
      });
      setShowBindPanel(false);
      const label = binding?.type === 'skill' ? binding.data.name : binding?.data.name;
      if (label) toast.info(`快捷键 ${HOTKEY_KEYS[bindSlot]} -> ${label}`);
    },
    [bindSlot],
  );

  const zoneTitle = primaryEnemy ? `${primaryEnemy.name} x ${aliveEnemyCount}` : '遭遇战';
  const zoneCoord = String(
    pageParams?.zoneName || pageParams?.sceneName || pageParams?.zoneId || dungeonId || '猎场宝山',
  );
  const rageValue = player?.actionGauge ?? 0;
  const playerHit = player ? hitIds.has(player.unitId) : false;
  const enemyHit = primaryEnemy ? hitIds.has(primaryEnemy.unitId) : false;

  return (
    <div className={styles.btPage}>
      {bgUrl && <div className={styles.btBg} style={{ backgroundImage: `url(${bgUrl})` }} />}
      <div className={styles.btBgOverlay} />
      <div ref={phaserRef} className={styles.btPhaserLayer} />

      {loading ? (
        <div className={styles.loadingState}>加载中...</div>
      ) : !battle?.id ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚔</span>
          <span className={styles.emptyTitle}>准备迎战</span>
          <span className={styles.emptyHint}>以当前角色属性开启一场遭遇战</span>
          <button className={styles.startBtn} onClick={handleStart}>
            开始战斗
          </button>
        </div>
      ) : (
        <>
          <div className={styles.battleScene}>
            <div className={styles.appbar}>
              <div className={styles.appbarRow}>
                <div className={styles.appbarLoc}>
                  <span className={`${styles.appbarBook} ${styles.appbarBookRed}`}>遭遇</span>
                  <span className={styles.appbarZone}>{zoneTitle}</span>
                  <span className={styles.appbarCoord}>{zoneCoord}</span>
                </div>
                <div className={styles.appbarIcons}>
                  <button className={styles.appbarIcon} onClick={handleBack}>
                    返
                  </button>
                  <button
                    className={`${styles.appbarIcon} ${autoMode ? styles.appbarIconActive : ''}`}
                    onClick={() => setAutoMode(value => !value)}
                  >
                    自
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.battleStage}>
              <div className={styles.fighter}>
                <div
                  className={`${styles.fighterWrap} ${playerHit ? styles.fighterHit : ''} ${
                    attackAnim === player?.unitId ? styles.fighterAttack : ''
                  }`}
                >
                  <PortraitCard unit={player} floats={playerFloats} />
                </div>
                <div className={styles.nm}>{player?.name || '主角'}</div>
                <div className={styles.sl}>
                  {player?.hp && player.hp > 0 ? (player?.defending ? '防守姿态' : '充能中') : '已倒下'}
                </div>
              </div>

              <div className={styles.vs}>
                <div className={styles.rd}>R {battle.round}</div>
                <div className={styles.sw}>⚔</div>
                <div className={styles.ar}>{playing ? '▼' : '◆'}</div>
                <div className={styles.ac}>{currentLog?.description || '破风杀'}</div>
              </div>

              <div className={styles.fighter}>
                <div
                  className={`${styles.fighterWrap} ${enemyHit ? styles.fighterHit : ''} ${
                    attackAnim === primaryEnemy?.unitId ? styles.fighterAttack : ''
                  }`}
                >
                  <PortraitCard unit={primaryEnemy} enemy floats={enemyFloats} />
                </div>
                <div className={`${styles.nm} ${styles.nmEnemy}`}>
                  {primaryEnemy ? `${primaryEnemy.name} [${primaryEnemy.hp}/${primaryEnemy.maxHp}]` : '暂无敌人'}
                </div>
                <div className={`${styles.sl} ${styles.slDim}`}>
                  {primaryEnemy ? `${aliveEnemyCount} 段` : '0 段'}
                </div>
              </div>
            </div>

            <div className={styles.barBlock}>
              <SegmentBar
                label="敌"
                value={`${primaryEnemy?.hp ?? 0}/${primaryEnemy?.maxHp ?? 0}`}
                max={toSegments(primaryEnemy?.hp ?? 0, primaryEnemy?.maxHp ?? 0)}
                tone="hp"
              />
              <SegmentBar
                label="体"
                value={`${player?.hp ?? 0}/${player?.maxHp ?? 0}`}
                max={toSegments(player?.hp ?? 0, player?.maxHp ?? 0)}
                tone="hp"
              />
              <SegmentBar
                label="气"
                value={`${player?.mp ?? 0}/${player?.maxMp ?? 0}`}
                max={toSegments(player?.mp ?? 0, player?.maxMp ?? 0)}
                tone="mp"
              />
              <SegmentBar
                label="怒"
                value={`${Math.round(rageValue)}%`}
                max={toSegments(rageValue, 100)}
                tone="rage"
              />
            </div>

            <div className={styles.skillsRow}>
              {visibleSkills.map((skill, index) => {
                const isLocked = skill.effectType === 'locked';
                const mpOk = !skill.mpCost || (player && player.mp >= skill.mpCost);
                const disabled = isLocked || !canAct || !mpOk;
                return (
                  <button
                    key={skill.skillId}
                    className={`${styles.sk} ${index === 0 && !disabled ? styles.skMain : ''} ${
                      disabled ? styles.skLock : ''
                    }`}
                    disabled={disabled}
                    onClick={() => handleSkillAction(skill)}
                  >
                    {skill.name}
                    <span className={styles.skCost}>
                      {isLocked
                        ? '怒气 100%'
                        : `MP ${skill.mpCost || 0}${skill.damageMultiplier > 1 ? ` · ×${skill.damageMultiplier}` : ''}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={styles.resRow}>
              {quickItems[0] ? (
                <button className={styles.po} disabled={!canAct} onClick={() => handleUseItem(quickItems[0])}>
                  {quickItems[0].name || '小红'} ×{quickItems[0].quantity}
                </button>
              ) : (
                <span className={styles.po}>小红 ×0</span>
              )}
              {quickItems[1] ? (
                <button
                  className={`${styles.po} ${styles.poMp}`}
                  disabled={!canAct}
                  onClick={() => handleUseItem(quickItems[1])}
                >
                  {quickItems[1].name || '小蓝'} ×{quickItems[1].quantity}
                </button>
              ) : (
                <span className={`${styles.po} ${styles.poMp}`}>小蓝 ×0</span>
              )}
              <span className={styles.pet}>宝宝 [领出]</span>
              <button className={styles.auto} onClick={() => setAutoMode(value => !value)}>
                自动 · {autoMode ? 'ON' : '30'}
              </button>
            </div>

            <div className={styles.battleLog}>
              {logLines.map((line, index) => (
                <div key={`${line}-${index}`} className={`${styles.logLine} ${logToneClass(line)}`}>
                  {line}
                </div>
              ))}
            </div>

            {!finished && (
              <div className={styles.battleActions}>
                <button className={`${styles.battleActionBtn} ${styles.battleActionRun}`} onClick={handleBack}>
                  放弃战
                </button>
                <button className={styles.battleActionBtn} onClick={() => openBind(0)}>
                  更换键
                </button>
                <button
                  className={styles.battleActionBtn}
                  onClick={() => {
                    if (hasBoundHotkey && canAct) {
                      triggerHotkey(hasBoundHotkey);
                    } else {
                      openBind(0);
                    }
                  }}
                >
                  快键
                </button>
              </div>
            )}
          </div>

          {showBindPanel && (
            <div className={styles.bindOverlay} onClick={() => setShowBindPanel(false)}>
              <div className={styles.bindPanel} onClick={event => event.stopPropagation()}>
                <div className={styles.bindTitle}>设置快捷键 {HOTKEY_KEYS[bindSlot]}</div>
                <div className={styles.bindTabs}>
                  <button
                    className={`${styles.bindTab} ${bindTab === 'skill' ? styles.bindTabActive : ''}`}
                    onClick={() => setBindTab('skill')}
                  >
                    技能
                  </button>
                  <button
                    className={`${styles.bindTab} ${bindTab === 'item' ? styles.bindTabActive : ''}`}
                    onClick={() => setBindTab('item')}
                  >
                    道具
                  </button>
                </div>
                <div className={styles.bindGrid}>
                  {bindTab === 'skill' ? (
                    skills.length === 0 ? (
                      <div className={styles.bindEmpty}>暂无技能</div>
                    ) : (
                      skills.map(skill => (
                        <button
                          key={skill.skillId}
                          className={styles.bindCard}
                          onClick={() => bindTo({ type: 'skill', data: skill })}
                        >
                          <span className={styles.bindCardIcon}>{skill.icon}</span>
                          <span className={styles.bindCardName}>{skill.name}</span>
                          {skill.mpCost > 0 && <span className={styles.bindCardSub}>{skill.mpCost} MP</span>}
                        </button>
                      ))
                    )
                  ) : bagItems.length === 0 ? (
                    <div className={styles.bindEmpty}>没有消耗品</div>
                  ) : (
                    bagItems.map(item => (
                      <button
                        key={item.id}
                        className={styles.bindCard}
                        onClick={() => bindTo({ type: 'item', data: item })}
                      >
                        <span className={styles.bindCardIcon}>{item.icon || '药'}</span>
                        <span className={styles.bindCardName}>{item.name || item.itemTypeId}</span>
                        <span className={styles.bindCardSub}>x{item.quantity}</span>
                      </button>
                    ))
                  )}
                </div>
                {hotkeys[bindSlot] && (
                  <button className={styles.bindClear} onClick={() => bindTo(null)}>
                    清除绑定
                  </button>
                )}
                <button className={styles.bindClose} onClick={() => setShowBindPanel(false)}>
                  取消
                </button>
              </div>
            </div>
          )}

          {finished && (
            <div className={`${styles.resultOverlay} ${battle.status === 'VICTORY' ? styles.victory : styles.defeat}`}>
              <div className={styles.resultIcon}>{battle.status === 'VICTORY' ? '🏆' : '✖'}</div>
              <div className={`${styles.resultTitle} ${battle.status === 'VICTORY' ? styles.victory : styles.defeat}`}>
                {battle.status === 'VICTORY' ? '战斗胜利' : '战斗失败'}
              </div>
              {battle.rewardDetail && (
                <div className={styles.rewardList}>
                  {battle.rewardDetail.gold != null && battle.rewardDetail.gold > 0 && (
                    <div className={styles.rewardItem}>
                      <span className={styles.rewardIcon}>金</span>
                      <span className={styles.rewardValue}>+{battle.rewardDetail.gold}</span>
                      <span className={styles.rewardLabel}>金币</span>
                    </div>
                  )}
                  {battle.rewardDetail.exp != null && battle.rewardDetail.exp > 0 && (
                    <div className={styles.rewardItem}>
                      <span className={styles.rewardIcon}>经</span>
                      <span className={styles.rewardValue}>+{battle.rewardDetail.exp}</span>
                      <span className={styles.rewardLabel}>经验</span>
                    </div>
                  )}
                  {battle.rewardDetail.dropItem && (
                    <div className={styles.rewardItem}>
                      <span className={styles.rewardIcon}>{battle.rewardDetail.dropIcon || '掉'}</span>
                      <span className={styles.rewardValue}>{battle.rewardDetail.dropItem}</span>
                      <span className={styles.rewardLabel}>掉落</span>
                    </div>
                  )}
                  {battle.rewardDetail.equipDrop && (
                    <div className={styles.rewardItem}>
                      <span className={styles.rewardIcon}>{battle.rewardDetail.equipDropIcon || '装'}</span>
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
                            width: `${
                              battle.rewardDetail.maxExp && battle.rewardDetail.maxExp > 0
                                ? Math.min(
                                    100,
                                    ((battle.rewardDetail.currentExp ?? 0) / battle.rewardDetail.maxExp) * 100,
                                  )
                                : 0
                            }%`,
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
                <button className={styles.btnGold} onClick={handleStart}>
                  再战一场
                </button>
                <button className={styles.btnGhost} onClick={handleBack}>
                  返回
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
