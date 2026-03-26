import React, { useState, useEffect, useCallback } from 'react';
import { fetchMyTitles, fetchAvailableTitles, equipTitle, unequipTitle, grantTitle } from '../../services/api';
import type { TitleData } from '../../services/api';
import { toast } from '../../store/toastStore';
import styles from './PageSkeleton.module.css';

const TYPE_LABELS: Record<string, { name: string; color: string; desc: string }> = {
  PRESTIGE: { name: '声望', color: '#e8a642', desc: '攻击 + 内力' },
  POWER: { name: '威望', color: '#5ca0d3', desc: '血量 + 防御' },
  HONOR: { name: '荣誉', color: '#d35c8a', desc: '附攻 + 附防 + 敏捷' },
};

type Tab = 'owned' | 'available';

export default function TitlePage() {
  const [tab, setTab] = useState<Tab>('owned');
  const [owned, setOwned] = useState<TitleData[]>([]);
  const [available, setAvailable] = useState<TitleData[]>([]);
  const [equippedId, setEquippedId] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [my, all] = await Promise.all([fetchMyTitles(), fetchAvailableTitles()]);
      setOwned(my.titles);
      setEquippedId(my.equippedId);
      setAvailable(all.titles);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEquip = async (titleId: string) => {
    await equipTitle(titleId);
    toast.success('称号已装备');
    load();
  };

  const handleUnequip = async () => {
    await unequipTitle();
    toast.success('称号已卸下');
    load();
  };

  const handleGrant = async (titleId: string) => {
    await grantTitle(titleId);
    toast.success('称号已获得');
    load();
  };

  const renderBonus = (t: TitleData) => {
    const b = t.bonus;
    const parts: string[] = [];
    if (b.atk) parts.push(`攻+${b.atk}`);
    if (b.def) parts.push(`防+${b.def}`);
    if (b.hp) parts.push(`血+${b.hp}`);
    if (b.magicAtk) parts.push(`魔攻+${b.magicAtk}`);
    if (b.extraAtk) parts.push(`附攻+${b.extraAtk}`);
    if (b.extraDef) parts.push(`附防+${b.extraDef}`);
    if (b.agility) parts.push(`敏+${b.agility}`);
    return parts.join(' ');
  };

  const titles = tab === 'owned' ? owned : available;
  const ownedIds = new Set(owned.map(t => t.titleId));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>称号</h2>
        <p className={styles.subtitle}>声望加攻 / 威望加防 / 荣誉加敏</p>
      </div>

      <div className={styles.tabRow}>
        <button className={`${styles.tabBtn} ${tab === 'owned' ? styles.tabActive : ''}`}
                onClick={() => setTab('owned')}>已拥有 ({owned.length})</button>
        <button className={`${styles.tabBtn} ${tab === 'available' ? styles.tabActive : ''}`}
                onClick={() => setTab('available')}>全部称号</button>
      </div>

      <div className={styles.scrollArea}>
        {loading && <p style={{ textAlign: 'center', opacity: 0.5 }}>加载中...</p>}

        {!loading && titles.length === 0 && (
          <p style={{ textAlign: 'center', opacity: 0.5 }}>
            {tab === 'owned' ? '暂无称号，去挑战获取吧' : '暂无可用称号'}
          </p>
        )}

        {titles.map((t) => {
          const info = TYPE_LABELS[t.titleType] || TYPE_LABELS.PRESTIGE;
          const isEquipped = t.titleId === equippedId;
          const isOwned = ownedIds.has(t.titleId);

          return (
            <div key={t.titleId} className={styles.card} style={{
              borderLeft: `3px solid ${info.color}`,
              background: isEquipped ? 'rgba(232,166,66,0.08)' : undefined,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, color: info.color }}>{t.name}</span>
                  <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.6 }}>
                    [{info.name}] Lv.{t.requiredLevel}
                  </span>
                  {isEquipped && <span style={{ marginLeft: 6, fontSize: 11, color: '#e8a642' }}>[装备中]</span>}
                </div>
                <div>
                  {tab === 'owned' && !isEquipped && (
                    <button className={styles.smallBtn} onClick={() => handleEquip(t.titleId)}>装备</button>
                  )}
                  {tab === 'owned' && isEquipped && (
                    <button className={styles.smallBtn} onClick={handleUnequip} style={{ opacity: 0.7 }}>卸下</button>
                  )}
                  {tab === 'available' && !isOwned && (
                    <button className={styles.smallBtn} onClick={() => handleGrant(t.titleId)}>获取</button>
                  )}
                  {tab === 'available' && isOwned && (
                    <span style={{ fontSize: 12, opacity: 0.5 }}>已拥有</span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 12, opacity: 0.6, margin: '4px 0 2px' }}>{t.description}</p>
              <p style={{ fontSize: 12, color: info.color }}>{renderBonus(t)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
