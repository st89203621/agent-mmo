import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { fetchEquipList, fetchRebirthStatus, fetchPersonInfo, allotPersonPoints, resetPersonPoints, logout, type EquipData, type PersonData } from '../../services/api';
import { QUALITY_NAMES, QUALITY_COLORS } from '../../constants/quality';
import { POSITION_LABELS } from '../../constants/equipment';
import page from '../../styles/page.module.css';
import own from './CharacterPage.module.css';

const styles = { ...page, ...own };

const ALLOT_STATS: { key: string; label: string; per: number }[] = [
  { key: 'hp', label: '生命', per: 20 },
  { key: 'mp', label: '法力', per: 10 },
  { key: 'physicsAttack', label: '物攻', per: 3 },
  { key: 'physicsDefense', label: '物防', per: 2 },
  { key: 'magicAttack', label: '法攻', per: 3 },
  { key: 'speed', label: '速度', per: 1 },
  { key: 'agility', label: '敏捷', per: 1 },
];

export default function CharacterPage() {
  const { playerWorld, gold, diamond, levelInfo } = usePlayerStore();
  const { navigateTo } = useGameStore();
  const [equips, setEquips] = useState<EquipData[]>([]);
  const [worldIndex, setWorldIndex] = useState(0);
  const [rebirthInfo, setRebirthInfo] = useState<{ currentWorldIndex: number; currentBook: string } | null>(null);
  const [person, setPerson] = useState<PersonData | null>(null);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [allocating, setAllocating] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    fetchEquipList().then((res) => setEquips(res.equips)).catch(() => {});
    fetchPersonInfo().then(p => {
      setPerson(p);
      if (p.level) usePlayerStore.getState().setLevelInfo(p.level);
      loadedRef.current = true;
    }).catch(() => {});
    fetchRebirthStatus()
      .then((data) => {
        setRebirthInfo(data);
        setWorldIndex(data.currentWorldIndex);
      })
      .catch(() => {});
  }, []);

  // 等级变化时重新拉取角色属性（实时同步升级后的加成）
  useEffect(() => {
    if (!loadedRef.current || !levelInfo?.level) return;
    fetchPersonInfo().then(p => setPerson(p)).catch(() => {});
  }, [levelInfo?.level]);

  const handleAllot = useCallback(async () => {
    const filtered = Object.fromEntries(Object.entries(pending).filter(([, v]) => v > 0));
    if (Object.keys(filtered).length === 0) return;
    setAllocating(true);
    try {
      await allotPersonPoints(filtered);
      const p = await fetchPersonInfo();
      setPerson(p);
      if (p.level) usePlayerStore.getState().setLevelInfo(p.level);
      setPending({});
    } catch { /* noop */ }
    setAllocating(false);
  }, [pending]);

  const handleReset = useCallback(async () => {
    if (!confirm('重置所有已分配的属性点？')) return;
    setAllocating(true);
    try {
      await resetPersonPoints();
      const p = await fetchPersonInfo();
      setPerson(p);
      if (p.level) usePlayerStore.getState().setLevelInfo(p.level);
      setPending({});
    } catch { /* noop */ }
    setAllocating(false);
  }, []);

  const getEquipForSlot = (position: number) =>
    equips.find((e) => e.position === position);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>角色</h2>
        {rebirthInfo && <p className={styles.subtitle}>{rebirthInfo.currentBook || '太古'}</p>}
      </div>

      {/* 七世时间轴 */}
      <div className={styles.timeline}>
        {Array.from({ length: 7 }).map((_, i) => {
          const isActive = i === worldIndex;
          const isDone = playerWorld?.worlds[i]?.status === 'COMPLETED';
          return (
            <button
              key={i}
              className={`${styles.worldDot} ${isActive ? styles.active : ''} ${isDone ? styles.done : ''}`}
              onClick={() => setWorldIndex(i)}
            >
              <span className={styles.worldNum}>{i + 1}</span>
              {isActive && <span className={styles.worldLabel}>当前</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.content}>
        {/* 角色基础信息 */}
        {person?.exists && person.basicProperty && (() => {
          const bp = person.basicProperty;
          const eb = equips.reduce(
            (acc, e) => {
              if (e.fixedProps) {
                acc.hp += e.fixedProps.hp ?? 0;
                acc.mp += e.fixedProps.mp ?? 0;
                acc.physicsAttack += e.fixedProps.physicsAttack ?? 0;
                acc.physicsDefense += e.fixedProps.physicsDefense ?? 0;
                acc.magicAttack += e.fixedProps.magicAttack ?? 0;
                acc.speed += e.fixedProps.speed ?? 0;
              }
              return acc;
            },
            { hp: 0, mp: 0, physicsAttack: 0, physicsDefense: 0, magicAttack: 0, speed: 0 }
          );
          return (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {person.name || '无名侠客'}
                {person.profession && (
                  <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
                    {({ ATTACK: '无坚不摧', DEFENSE: '金刚护体', AGILITY: '行动敏捷' } as Record<string, string>)[person.profession] || person.profession}
                  </span>
                )}
              </h3>

              {levelInfo && (
                <div className={styles.levelRow}>
                  <span className={styles.levelBadge}>Lv.{levelInfo.level}</span>
                  <div className={styles.expBarWrap}>
                    <div
                      className={styles.expBarFill}
                      style={{ width: `${levelInfo.maxExp > 0 ? Math.min(100, (levelInfo.exp / levelInfo.maxExp) * 100) : 0}%` }}
                    />
                  </div>
                  <span className={styles.expText}>{levelInfo.exp}/{levelInfo.maxExp}</span>
                </div>
              )}

              <div className={styles.statsGrid}>
                <div className={styles.statItem}><span>生命</span><span className={styles.statVal}>{bp.hp + eb.hp}</span></div>
                <div className={styles.statItem}><span>法力</span><span className={styles.statVal}>{bp.mp + eb.mp}</span></div>
                <div className={styles.statItem}><span>物攻</span><span className={styles.statVal}>{bp.physicsAttack + eb.physicsAttack}</span></div>
                <div className={styles.statItem}><span>物防</span><span className={styles.statVal}>{bp.physicsDefense + eb.physicsDefense}</span></div>
                <div className={styles.statItem}><span>法攻</span><span className={styles.statVal}>{bp.magicAttack + eb.magicAttack}</span></div>
                <div className={styles.statItem}><span>速度</span><span className={styles.statVal}>{bp.speed + eb.speed}</span></div>
              </div>
              <div className={styles.statsGrid} style={{ marginTop: 8 }}>
                <div className={styles.statItem}><span>附攻</span><span className={styles.statVal} style={{ color: '#e8a642' }}>{bp.bonusAttack}</span></div>
                <div className={styles.statItem}><span>附防</span><span className={styles.statVal} style={{ color: '#5ca0d3' }}>{bp.bonusDefense}</span></div>
                <div className={styles.statItem}><span>敏捷</span><span className={styles.statVal} style={{ color: '#d35c8a' }}>{bp.agility}</span></div>
                <div className={styles.statItem}><span>暴击</span><span className={styles.statVal} style={{ color: '#d35c8a' }}>{bp.critRate}%</span></div>
              </div>
              <div className={styles.statsGrid} style={{ marginTop: 8 }}>
                <div className={styles.statItem}><span>金币</span><span className={styles.statVal} style={{ color: '#d4a84c' }}>{gold}</span></div>
                <div className={styles.statItem}><span>钻石</span><span className={styles.statVal} style={{ color: '#7ec8e3' }}>{diamond}</span></div>
              </div>
            </section>
          );
        })()}

        {/* 属性分配 */}
        {person?.exists && (person.attributePoints ?? 0) > 0 && (() => {
          const used = Object.values(pending).reduce((a, b) => a + b, 0);
          const remaining = (person.attributePoints ?? 0) - used;
          return (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                属性分配
                <span className={styles.attrPointsBadge}>{remaining} 点可用</span>
              </h3>
              <div className={styles.allotGrid}>
                {ALLOT_STATS.map(({ key, label, per }) => {
                  const pts = pending[key] ?? 0;
                  return (
                    <div key={key} className={styles.allotRow}>
                      <span className={styles.allotLabel}>{label}</span>
                      <span className={styles.allotPer}>+{per}/点</span>
                      <div className={styles.allotControls}>
                        <button className={styles.allotBtn} disabled={pts <= 0}
                          onClick={() => setPending(p => ({ ...p, [key]: Math.max(0, (p[key] ?? 0) - 1) }))}>−</button>
                        <span className={styles.allotCount}>{pts}</span>
                        <button className={styles.allotBtn} disabled={remaining <= 0}
                          onClick={() => setPending(p => ({ ...p, [key]: (p[key] ?? 0) + 1 }))}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {used > 0 && (
                  <button className={styles.allotConfirmBtn} style={{ flex: 1 }} disabled={allocating} onClick={handleAllot}>
                    {allocating ? '...' : `确认分配 (${used}点)`}
                  </button>
                )}
                <button
                  className={styles.allotConfirmBtn}
                  style={{ flex: used > 0 ? '0 0 80px' : 1, background: 'var(--paper-darker)', color: 'var(--ink)' }}
                  disabled={allocating}
                  onClick={handleReset}
                >
                  重置
                </button>
              </div>
            </section>
          );
        })()}

        {/* 装备槽 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>装备</h3>
          <div className={styles.equipGrid}>
            {[1, 2, 3, 4, 5].map((pos) => {
              const equip = getEquipForSlot(pos);
              const meta = POSITION_LABELS[pos];
              return (
                <button
                  key={pos}
                  className={`${styles.equipSlot} ${equip ? styles.equipped : ''}`}
                  style={equip ? { borderColor: QUALITY_COLORS[equip.quality] || QUALITY_COLORS[0] } : undefined}
                  onClick={() => {
                    if (equip) {
                      navigateTo('equip-detail', { equipId: equip.id });
                    } else {
                      navigateTo('shop');
                    }
                  }}
                >
                  <span className={styles.equipIcon}>{equip?.icon || meta.icon}</span>
                  {equip ? (
                    <span className={styles.equipName} style={{ color: QUALITY_COLORS[equip.quality] || QUALITY_COLORS[0] }}>
                      {equip.name || `Lv.${equip.level}`}
                    </span>
                  ) : (
                    <span className={styles.equipLabel}>{meta.label}<span style={{ fontSize: 10, opacity: 0.5 }}>（去获取）</span></span>
                  )}
                  {equip && (
                    <span className={styles.qualityDot} style={{ background: QUALITY_COLORS[equip.quality] || QUALITY_COLORS[0] }}>
                      {QUALITY_NAMES[equip.quality] || '普通'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 快捷入口 */}
        <section className={styles.section}>
          <div className={styles.quickLinks}>
            {([
              ['inventory', '背包'], ['shop', '商城'], ['enchant', '附魔'],
              ['skill-tree', '技能树'], ['pet', '宠物'], ['companion', '灵侣'],
              ['dungeon', '副本'], ['quest', '任务'], ['battle', '战斗'],
              ['rebirth', '轮回'], ['memory', '记忆'],
              ['achievement', '因缘谱', { tab: 'fate' }],
              ['book-world', '书库'], ['codex', '图鉴'],
              ['title', '称号'], ['guild', '盟会'], ['scene', '场景'],
              ['treasure-mountain', '聚宝山'], ['flower', '情花'],
              ['trade', '交易'], ['team-battle', '组队PvP'], ['coexplore', '共探书境'],
              ['achievement', '排行', { tab: 'rank' }],
            ] as [string, string, Record<string, unknown>?][]).map(([page, label, params]) => (
              <button key={label} className={styles.quickLink}
                onClick={() => navigateTo(page as any, params)}>{label}</button>
            ))}
            <button className={styles.quickLink} style={{ color: '#c44e52', borderColor: 'rgba(196,78,82,0.3)' }}
              onClick={() => { if (confirm('确认退出登录？')) { logout().catch(() => {}); location.reload(); } }}
            >退出账号</button>
          </div>
        </section>
      </div>
    </div>
  );
}
