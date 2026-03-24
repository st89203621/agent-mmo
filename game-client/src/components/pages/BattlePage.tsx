import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  startBattle, getBattleState, battleAction, fetchPersonInfo, fetchPlayerCurrency,
  type BattleData, type BattleUnitData, type BattleActionData, type BattleSkillData,
} from '../../services/api';
import styles from './BattlePage.module.css';

const ENEMY_AVATARS: Record<string, string> = {
  妖狐: '🦊', 石魔: '🗿', 幽灵: '👻', 蛮兽: '🐗', 暗影刺客: '🥷',
  血蝠: '🦇', 冰魄: '❄️', 火灵: '🔥',
};

function UnitCard({ unit, isPlayer }: { unit: BattleUnitData; isPlayer: boolean }) {
  const hpPct = unit.maxHp > 0 ? Math.round((unit.hp / unit.maxHp) * 100) : 0;
  const mpPct = unit.maxMp > 0 ? Math.round((unit.mp / unit.maxMp) * 100) : 0;
  const hpColor = hpPct > 50 ? '#4caf50' : hpPct > 20 ? '#d4a84c' : '#c44e52';
  const avatar = isPlayer ? '🧙' : (ENEMY_AVATARS[unit.name] || '👹');

  return (
    <div className={`${styles.unitCard} ${unit.hp <= 0 ? styles.dead : ''} ${unit.defending ? styles.defending : ''}`}>
      <div className={styles.unitAvatar}>{avatar}</div>
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

export default function BattlePage() {
  const { navigateTo } = useGameStore();
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [logs, setLogs] = useState<BattleActionData[]>([]);
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

  // 日志自动滚到底部
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

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
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  const handleSkillAction = useCallback(async (skill: BattleSkillData) => {
    if (!battle || battle.status !== 'ONGOING') return;
    setActing(true);
    try {
      const target = battle.enemyUnits.find(u => u.hp > 0);
      let actionType = 'ATTACK';
      if (skill.effectType === 'buff_defense') actionType = 'DEFEND';
      else if (skill.skillId !== 'attack') actionType = 'SKILL';

      const res = await battleAction(actionType, target?.unitId, skill.skillId);
      setBattle(res.battle);
      setLogs(prev => [...prev, ...(res.battle.actionLog || [])]);

      // 胜利后刷新货币
      if (res.battle.status === 'VICTORY') {
        fetchPlayerCurrency().then(c => {
          usePlayerStore.getState().setCurrency(c.gold, c.diamond);
        }).catch(() => {});
      }
    } catch { /* noop */ }
    setActing(false);
  }, [battle]);

  const finished = battle?.status === 'VICTORY' || battle?.status === 'DEFEAT';
  const player = battle?.playerUnits[0];

  return (
    <div className={styles.page}>
      {/* 战斗主区域 */}
      <div className={styles.battleArea}>
        {loading ? (
          <div className={styles.emptyState}>
            <p>加载中...</p>
          </div>
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
            <div style={{
              textAlign: 'center', fontSize: 12, color: 'var(--ink)', opacity: 0.5,
              marginBottom: 8,
            }}>
              回合 {battle.round} · {battle.status === 'ONGOING' ? '进行中' : battle.status === 'VICTORY' ? '胜利' : '战败'}
            </div>

            {/* 敌方 */}
            <div className={styles.sectionLabel}>敌方</div>
            {battle.enemyUnits.map(u => (
              <UnitCard key={u.unitId} unit={u} isPlayer={false} />
            ))}

            {/* 战斗日志 */}
            {logs.length > 0 && (
              <div className={styles.logArea} ref={logRef}>
                {logs.map((a, i) => (
                  <div key={i} className={styles.logEntry}>
                    {a.damage > 0 && <span style={{ color: '#c44e52', fontWeight: 600 }}>-{a.damage} </span>}
                    {a.heal > 0 && <span style={{ color: '#4caf50', fontWeight: 600 }}>+{a.heal} </span>}
                    {a.description}
                  </div>
                ))}
              </div>
            )}

            {/* 我方 */}
            <div className={styles.sectionLabel}>我方</div>
            {battle.playerUnits.map(u => (
              <UnitCard key={u.unitId} unit={u} isPlayer={true} />
            ))}

            {/* 战斗结果 */}
            {finished && (
              <div className={styles.resultCard}
                style={{ border: `1px solid ${battle.status === 'VICTORY' ? '#4caf50' : '#c44e52'}` }}>
                <div className={styles.resultEmoji}>
                  {battle.status === 'VICTORY' ? '🏆' : '💀'}
                </div>
                <div className={styles.resultTitle}
                  style={{ color: battle.status === 'VICTORY' ? '#4caf50' : '#c44e52' }}>
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
                  <button className={styles.btnSecondary} onClick={() => navigateTo('character')}>返回</button>
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
            {(battle.availableSkills || []).map(skill => {
              const mpOk = !skill.mpCost || (player && player.mp >= skill.mpCost);
              return (
                <button
                  key={skill.skillId}
                  className={styles.skillBtn}
                  disabled={acting || !mpOk}
                  onClick={() => handleSkillAction(skill)}
                >
                  <span className={styles.skillIcon}>{skill.icon}</span>
                  <span className={styles.skillName}>{skill.name}</span>
                  {skill.mpCost > 0 && (
                    <span className={styles.skillCost}>{skill.mpCost} MP</span>
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
