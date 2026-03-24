import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { fetchEquipList, fetchRebirthStatus, fetchPersonInfo, type EquipData, type PersonData } from '../../services/api';
import styles from './CharacterPage.module.css';

const POSITION_LABELS: Record<number, { label: string; icon: string }> = {
  1: { label: '武器', icon: '🗡️' },
  2: { label: '护甲', icon: '🛡️' },
  3: { label: '饰品', icon: '💍' },
  4: { label: '坐骑', icon: '🐴' },
  5: { label: '宠物蛋', icon: '🥚' },
};

const QUALITY_NAMES = ['普通', '精良', '稀有', '史诗', '传说', '神话'];
const QUALITY_COLORS = [
  'var(--quality-common)', 'var(--quality-uncommon)', 'var(--quality-rare)',
  'var(--quality-epic)', 'var(--quality-legendary)', 'var(--quality-mythic)',
];

export default function CharacterPage() {
  const { playerWorld } = usePlayerStore();
  const { navigateTo } = useGameStore();
  const [equips, setEquips] = useState<EquipData[]>([]);
  const [worldIndex, setWorldIndex] = useState(0);
  const [rebirthInfo, setRebirthInfo] = useState<{ currentWorldIndex: number; currentBook: string } | null>(null);
  const [person, setPerson] = useState<PersonData | null>(null);
  const { gold, diamond } = usePlayerStore();

  useEffect(() => {
    fetchEquipList().then((res) => setEquips(res.equips)).catch(() => {});
    fetchPersonInfo().then(setPerson).catch(() => {});
    fetchRebirthStatus()
      .then((data) => {
        setRebirthInfo(data);
        setWorldIndex(data.currentWorldIndex);
      })
      .catch(() => {});
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
        {person?.exists && person.basicProperty && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{person.name || '无名侠客'}</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}><span>生命</span><span className={styles.statVal}>{person.basicProperty.hp}</span></div>
              <div className={styles.statItem}><span>法力</span><span className={styles.statVal}>{person.basicProperty.mp}</span></div>
              <div className={styles.statItem}><span>物攻</span><span className={styles.statVal}>{person.basicProperty.physicsAttack}</span></div>
              <div className={styles.statItem}><span>物防</span><span className={styles.statVal}>{person.basicProperty.physicsDefense}</span></div>
              <div className={styles.statItem}><span>法攻</span><span className={styles.statVal}>{person.basicProperty.magicAttack}</span></div>
              <div className={styles.statItem}><span>速度</span><span className={styles.statVal}>{person.basicProperty.speed}</span></div>
            </div>
            <div className={styles.statsGrid} style={{ marginTop: 8 }}>
              <div className={styles.statItem}><span>金币</span><span className={styles.statVal} style={{ color: '#d4a84c' }}>{gold}</span></div>
              <div className={styles.statItem}><span>钻石</span><span className={styles.statVal} style={{ color: '#7ec8e3' }}>{diamond}</span></div>
            </div>
          </section>
        )}

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
                    }
                  }}
                >
                  <span className={styles.equipIcon}>{meta.icon}</span>
                  {equip ? (
                    <span className={styles.equipName} style={{ color: QUALITY_COLORS[equip.quality] || QUALITY_COLORS[0] }}>
                      Lv.{equip.level}
                    </span>
                  ) : (
                    <span className={styles.equipLabel}>{meta.label}</span>
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

        {/* 属性总览 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>属性</h3>
          <div className={styles.statsGrid}>
            {equips.length > 0 ? (
              (() => {
                const total = equips.reduce((acc, e) => {
                  if (e.fixedProps) {
                    acc.hp += e.fixedProps.hp;
                    acc.mp += e.fixedProps.mp;
                    acc.atk += e.fixedProps.physicsAttack;
                    acc.def += e.fixedProps.physicsDefense;
                    acc.matk += e.fixedProps.magicAttack;
                    acc.spd += e.fixedProps.speed;
                  }
                  return acc;
                }, { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, spd: 0 });
                return (
                  <>
                    <div className={styles.statItem}><span>生命</span><span className={styles.statVal}>{total.hp}</span></div>
                    <div className={styles.statItem}><span>法力</span><span className={styles.statVal}>{total.mp}</span></div>
                    <div className={styles.statItem}><span>物攻</span><span className={styles.statVal}>{total.atk}</span></div>
                    <div className={styles.statItem}><span>物防</span><span className={styles.statVal}>{total.def}</span></div>
                    <div className={styles.statItem}><span>法攻</span><span className={styles.statVal}>{total.matk}</span></div>
                    <div className={styles.statItem}><span>速度</span><span className={styles.statVal}>{total.spd}</span></div>
                  </>
                );
              })()
            ) : (
              <p className={styles.emptyText}>暂无装备</p>
            )}
          </div>
        </section>

        {/* 快捷入口 */}
        <section className={styles.section}>
          <div className={styles.quickLinks}>
            <button className={styles.quickLink} onClick={() => navigateTo('skill-tree')}>技能树</button>
            <button className={styles.quickLink} onClick={() => navigateTo('pet')}>宠物</button>
            <button className={styles.quickLink} onClick={() => navigateTo('enchant')}>附魔</button>
            <button className={styles.quickLink} onClick={() => navigateTo('rebirth')}>轮回</button>
            <button className={styles.quickLink} onClick={() => navigateTo('memory')}>记忆</button>
            <button className={styles.quickLink} onClick={() => navigateTo('book-world')}>书库</button>
            <button className={styles.quickLink} onClick={() => navigateTo('codex')}>图鉴</button>
            <button className={styles.quickLink} onClick={() => navigateTo('dungeon')}>副本</button>
            <button className={styles.quickLink} onClick={() => navigateTo('quest')}>任务</button>
            <button className={styles.quickLink} onClick={() => navigateTo('shop')}>商城</button>
            <button className={styles.quickLink} onClick={() => navigateTo('companion')}>灵侣</button>
            <button className={styles.quickLink} onClick={() => navigateTo('rank')}>排行</button>
          </div>
        </section>
      </div>
    </div>
  );
}
