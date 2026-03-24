import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import {
  startBattle, getBattleState, battleAction, fetchPersonInfo, fetchPlayerCurrency,
  type BattleData, type BattleUnitData, type BattleActionData, type BattleSkillData,
} from '../../services/api';
import styles from './BattlePage.module.css';

const ENEMY_AVATARS: Record<string, string> = {
  妖狐: '🦊', 石魔: '🗿', 幽灵: '👻', 蛮兽: '🐗', 暗影刺客: '🥷',
  血蝠: '🦇', 冰魄: '❄️', 火灵: '🔥', 毒蛛: '🕷️', 魔龙: '🐉',
};

interface FloatingDamage {
  id: number;
  unitId: string;
  value: number;
  isHeal: boolean;
}

let dmgSeq = 0;

function UnitCard({ unit, isPlayer, floats }: { unit: BattleUnitData; isPlayer: boolean; floats: FloatingDamage[] }) {
  const hpPct = unit.maxHp > 0 ? Math.round((unit.hp / unit.maxHp) * 100) : 0;
  const mpPct = unit.maxMp > 0 ? Math.round((unit.mp / unit.maxMp) * 100) : 0;
  const hpColor = hpPct > 50 ? '#4caf50' : hpPct > 20 ? '#d4a84c' : '#c44e52';
  const avatar = isPlayer ? '🧙' : (ENEMY_AVATARS[unit.name] || '👹');
  const myFloats = floats.filter((f) => f.unitId === unit.unitId);
  const isHit = myFloats.some((f) => !f.isHeal);

  return (
    <div className={`${styles.unitCard} ${unit.hp <= 0 ? styles.dead : ''} ${unit.defending ? styles.defending : ''} ${isHit ? styles.shake : ''}`}>
      <div className={styles.unitAvatar}>
        {avatar}
        {/* 浮动伤害数字 */}
        {myFloats.map((f) => (
          <span key={f.id} className={f.isHeal ? styles.floatHeal : styles.floatDamage}>
            {f.isHeal ? '+' : '-'}{f.value}
          </span>
        ))}
      </div>
      <div className={styles.unitInfo}>
        <div className={styles.unitName}>
          {unit.name}
          {unit.defending && <span className={styles.defendTag}>防御中</span>}
        </div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>HP</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${hpPct}%`, background: hpColor }} />
          </div>
          <span className={styles.barValue}>{unit.hp}/{unit.maxHp}</span>
        </div>
        {unit.maxMp > 0 && (
          <div className={styles.barRow}>
            <span className={styles.barLabel}>MP</span>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${mpPct}%`, background: '#6699ff' }} />
            </div>
            <span className={styles.barValue}>{unit.mp}/{unit.maxMp}</span>
          </div>
        )}
      </div>
    </div>
  );
}

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
          {skill.damageMultiplier > 0 && <div>伤害倍率: {skill.damageMultiplier}x</div>}
          {skill.effectType && <div>效果: {
            skill.effectType === 'physical_damage' ? '物理伤害' :
            skill.effectType === 'magic_damage' ? '魔法伤害' :
            skill.effectType === 'buff_defense' ? '提升防御' :
            skill.effectType === 'heal' ? '恢复生命' :
            skill.effectType
          }</div>}
        </div>
      )}
    </div>
  );
}

export default function BattlePage() {
  const { navigateTo } = useGameStore();
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [logs, setLogs] = useState<BattleActionData[]>([]);
  const [floats, setFloats] = useState<FloatingDamage[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addFloats = useCallback((actions: BattleActionData[], allUnits: BattleUnitData[]) => {
    const newFloats: FloatingDamage[] = [];
    for (const a of actions) {
      const targetUnit = allUnits.find((u) => u.name === a.targetName);
      if (!targetUnit) continue;
      if (a.damage > 0) {
        newFloats.push({ id: ++dmgSeq, unitId: targetUnit.unitId, value: a.damage, isHeal: false });
      }
      if (a.heal > 0) {
        newFloats.push({ id: ++dmgSeq, unitId: targetUnit.unitId, value: a.heal, isHeal: true });
      }
    }
    if (newFloats.length > 0) {
      setFloats(newFloats);
      setTimeout(() => setFloats([]), 1200);
    }
  }, []);

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
      toast.info('战斗开始！');
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  const handleSkillAction = useCallback(async (skill: BattleSkillData) => {
    if (!battle || battle.status !== 'ONGOING') return;
    setActing(true);
    try {
      const target = battle.enemyUnits.find((u) => u.hp > 0);
      let actionType = 'ATTACK';
      if (skill.effectType === 'buff_defense') actionType = 'DEFEND';
      else if (skill.skillId !== 'attack') actionType = 'SKILL';

      const res = await battleAction(actionType, target?.unitId, skill.skillId);
      setBattle(res.battle);

      const newActions = res.battle.actionLog || [];
      setLogs((prev) => [...prev, ...newActions]);

      // 飘字
      const allUnits = [...(res.battle.playerUnits || []), ...(res.battle.enemyUnits || [])];
      addFloats(newActions, allUnits);

      if (res.battle.status === 'VICTORY') {
        toast.reward('战斗胜利！');
        fetchPlayerCurrency().then((c) => {
          usePlayerStore.getState().setCurrency(c.gold, c.diamond);
        }).catch(() => {});
      } else if (res.battle.status === 'DEFEAT') {
        toast.error('战斗失败...');
      }
    } catch { /* noop */ }
    setActing(false);
  }, [battle, addFloats]);

  const finished = battle?.status === 'VICTORY' || battle?.status === 'DEFEAT';
  const player = battle?.playerUnits[0];

  return (
    <div className={styles.page}>
      <div className={styles.battleArea}>
        {loading ? (
          <div className={styles.emptyState}><p>加载中...</p></div>
        ) : !battle?.id ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>⚔️</span>
            <p style={{ fontSize: 16, fontWeight: 600 }}>准备进入战斗</p>
            <p style={{ fontSize: 13, opacity: 0.5 }}>以你的角色属性迎战随机敌人</p>
            <button className={styles.btnPrimary} style={{ marginTop: 12 }} onClick={handleStart}>
              开始战斗
            </button>
          </div>
        ) : (
          <>
            {/* 回合信息 */}
            <div className={styles.roundInfo}>
              <span className={styles.roundBadge}>回合 {battle.round}</span>
              <span className={`${styles.statusBadge} ${battle.status === 'VICTORY' ? styles.statusWin : battle.status === 'DEFEAT' ? styles.statusLose : ''}`}>
                {battle.status === 'ONGOING' ? '战斗中' : battle.status === 'VICTORY' ? '胜利' : '战败'}
              </span>
            </div>

            {/* 敌方 */}
            <div className={styles.sectionLabel}>敌方</div>
            {battle.enemyUnits.map((u) => (
              <UnitCard key={u.unitId} unit={u} isPlayer={false} floats={floats} />
            ))}

            {/* 战斗日志 */}
            {logs.length > 0 && (
              <div className={styles.logArea} ref={logRef}>
                {logs.map((a, i) => (
                  <div key={i} className={styles.logEntry}>
                    <span className={styles.logActor}>{a.actorName}</span>
                    {a.skillName && a.skillName !== 'attack' && (
                      <span className={styles.logSkill}> [{a.skillName}]</span>
                    )}
                    {a.damage > 0 && <span className={styles.logDmg}> -{a.damage}</span>}
                    {a.heal > 0 && <span className={styles.logHeal}> +{a.heal}</span>}
                    <span className={styles.logDesc}> {a.description}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 我方 */}
            <div className={styles.sectionLabel}>我方</div>
            {battle.playerUnits.map((u) => (
              <UnitCard key={u.unitId} unit={u} isPlayer={true} floats={floats} />
            ))}

            {/* 战斗结果 */}
            {finished && (
              <div className={`${styles.resultCard} ${battle.status === 'VICTORY' ? styles.resultWin : styles.resultLose}`}>
                <div className={styles.resultEmoji}>
                  {battle.status === 'VICTORY' ? '🏆' : '💀'}
                </div>
                <div className={styles.resultTitle}>
                  {battle.status === 'VICTORY' ? '胜利！' : '战败...'}
                </div>
                {battle.rewardDetail && (
                  <div className={styles.rewardRow}>
                    {battle.rewardDetail.gold != null && battle.rewardDetail.gold > 0 && (
                      <span className={styles.rewardItem}>
                        <span style={{ color: '#d4a84c' }}>💰</span> +{battle.rewardDetail.gold}
                      </span>
                    )}
                    {battle.rewardDetail.exp != null && battle.rewardDetail.exp > 0 && (
                      <span className={styles.rewardItem}>
                        <span style={{ color: '#7ec8e3' }}>✨</span> +{battle.rewardDetail.exp} EXP
                      </span>
                    )}
                    {battle.rewardDetail.dropItem && (
                      <span className={styles.rewardItem}>
                        {battle.rewardDetail.dropIcon || '📦'} {battle.rewardDetail.dropItem}
                      </span>
                    )}
                  </div>
                )}
                <div className={styles.resultActions}>
                  <button className={styles.btnPrimary} onClick={handleStart}>再战一场</button>
                  <button className={styles.btnSecondary} onClick={() => navigateTo('home')}>返回</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部技能面板 */}
      {battle?.id && !finished && (
        <div className={styles.skillPanel}>
          <div className={styles.skillGrid}>
            {(battle.availableSkills || []).map((skill) => {
              const mpOk = !skill.mpCost || (player && player.mp >= skill.mpCost);
              return (
                <button
                  key={skill.skillId}
                  className={styles.skillBtn}
                  disabled={acting || !mpOk}
                  onClick={() => handleSkillAction(skill)}
                >
                  <SkillTooltip skill={skill} />
                  <span className={styles.skillIcon}>{skill.icon}</span>
                  <span className={styles.skillName}>{skill.name}</span>
                  {skill.mpCost > 0 && (
                    <span className={styles.skillCost}>{skill.mpCost} MP</span>
                  )}
                  {skill.damageMultiplier > 1 && (
                    <span className={styles.skillMult}>{skill.damageMultiplier}x</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
