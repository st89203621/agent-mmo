import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  startBattle, getBattleState, battleAction, fetchPersonInfo,
  type BattleData, type BattleUnitData, type BattleActionData,
} from '../../services/api';
import styles from './PageSkeleton.module.css';

function HpBar({ unit }: { unit: BattleUnitData }) {
  const pct = unit.maxHp > 0 ? Math.round((unit.hp / unit.maxHp) * 100) : 0;
  const color = pct > 50 ? 'var(--green, #4caf50)' : pct > 20 ? 'var(--gold)' : 'var(--red, #c44)';
  return (
    <div style={{ marginTop: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', opacity: 0.6 }}>
        <span>{unit.name}</span>
        <span>{unit.hp}/{unit.maxHp}</span>
      </div>
      <div style={{ height: '6px', background: 'var(--paper-darker)', borderRadius: '3px', overflow: 'hidden', marginTop: '2px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
      </div>
      {unit.maxMp > 0 && (
        <div style={{ height: '3px', background: 'var(--paper-darker)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
          <div style={{
            height: '100%',
            width: `${unit.maxMp > 0 ? Math.round((unit.mp / unit.maxMp) * 100) : 0}%`,
            background: '#6699ff', borderRadius: '2px', transition: 'width 0.4s',
          }} />
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

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      // 获取角色属性用于初始化战斗
      const person = await fetchPersonInfo();
      const bp = person.basicProperty || { hp: 100, mp: 50, physicsAttack: 15, physicsDefense: 8, magicAttack: 12, magicDefense: 8, speed: 10 };
      const res = await startBattle(bp);
      setBattle(res.battle);
      setLogs([]);
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  const handleAction = useCallback(async (actionType: string) => {
    if (!battle || battle.status !== 'ONGOING') return;
    setActing(true);
    try {
      const target = battle.enemyUnits.find(u => u.hp > 0);
      const res = await battleAction(actionType, target?.unitId);
      setBattle(res.battle);
      setLogs(prev => [...prev, ...(res.battle.actionLog || [])]);
    } catch { /* noop */ }
    setActing(false);
  }, [battle]);

  const finished = battle?.status === 'VICTORY' || battle?.status === 'DEFEAT';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>战斗</h2>
        {battle && <p className={styles.subtitle}>回合 {battle.round} · {battle.status === 'ONGOING' ? '进行中' : battle.status === 'VICTORY' ? '胜利' : '战败'}</p>}
      </div>

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : !battle || !battle.id ? (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>⚔️</span>
            <p>准备进入战斗</p>
            <p className={styles.hint}>以你的角色属性迎战随机敌人</p>
            <button className={styles.primaryBtn} style={{ width: 'auto', padding: '12px 32px' }} onClick={handleStart}>
              开始战斗
            </button>
          </div>
        ) : (
          <>
            {/* 敌方区域 */}
            <section style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.5, marginBottom: '6px' }}>敌方</p>
              {battle.enemyUnits.map(u => (
                <div key={u.unitId} style={{
                  padding: '10px 12px', background: 'var(--paper-dark)',
                  borderRadius: 'var(--radius-md)', marginBottom: '4px',
                  opacity: u.hp <= 0 ? 0.3 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>👹</span>
                    <div style={{ flex: 1 }}><HpBar unit={u} /></div>
                  </div>
                </div>
              ))}
            </section>

            {/* 玩家区域 */}
            <section style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.5, marginBottom: '6px' }}>我方</p>
              {battle.playerUnits.map(u => (
                <div key={u.unitId} style={{
                  padding: '10px 12px', background: 'var(--paper-dark)',
                  borderRadius: 'var(--radius-md)', marginBottom: '4px',
                  border: '1px solid var(--gold)', opacity: u.hp <= 0 ? 0.3 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🧙</span>
                    <div style={{ flex: 1 }}><HpBar unit={u} /></div>
                  </div>
                </div>
              ))}
            </section>

            {/* 行动按钮 */}
            {!finished && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button className={styles.actionBtn} style={{ flex: 1, marginTop: 0 }}
                  disabled={acting} onClick={() => handleAction('ATTACK')}>
                  {acting ? '...' : '攻击'}
                </button>
                <button className={styles.actionBtn} style={{ flex: 1, marginTop: 0, background: 'var(--paper-dark)', border: '1px solid var(--gold)' }}
                  disabled={acting} onClick={() => handleAction('SKILL')}>
                  {acting ? '...' : '法术'}
                </button>
                <button className={styles.actionBtn} style={{ flex: 1, marginTop: 0, background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)' }}
                  disabled={acting} onClick={() => handleAction('DEFEND')}>
                  {acting ? '...' : '防御'}
                </button>
              </div>
            )}

            {/* 战斗结果 */}
            {finished && (
              <div style={{
                textAlign: 'center', padding: '20px', marginBottom: '16px',
                background: 'var(--paper-dark)', borderRadius: 'var(--radius-md)',
                border: `1px solid ${battle.status === 'VICTORY' ? 'var(--green, #4caf50)' : 'var(--red, #c44)'}`,
              }}>
                <p style={{ fontSize: '24px', marginBottom: '8px' }}>{battle.status === 'VICTORY' ? '🏆' : '💀'}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: battle.status === 'VICTORY' ? 'var(--green, #4caf50)' : 'var(--red, #c44)' }}>
                  {battle.status === 'VICTORY' ? '胜利！' : '战败...'}
                </p>
                {battle.rewards && (
                  <p style={{ fontSize: '13px', color: 'var(--gold-dim)', marginTop: '8px' }}>
                    {battle.rewards}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                  <button className={styles.actionBtn} onClick={handleStart}>再战一场</button>
                  <button className={styles.actionBtn}
                    style={{ background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)' }}
                    onClick={() => navigateTo('character')}>返回</button>
                </div>
              </div>
            )}

            {/* 战斗日志 */}
            {logs.length > 0 && (
              <section>
                <p style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.5, marginBottom: '6px' }}>战斗日志</p>
                <div style={{
                  maxHeight: '150px', overflowY: 'auto', padding: '8px 10px',
                  background: 'var(--paper-dark)', borderRadius: 'var(--radius-md)',
                  fontSize: '12px', lineHeight: 1.8, color: 'var(--ink)', opacity: 0.7,
                }}>
                  {logs.map((a, i) => (
                    <div key={i}>{a.description}</div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
