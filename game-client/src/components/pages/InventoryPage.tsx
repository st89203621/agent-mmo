import React, { useEffect, useState, useCallback } from 'react';
import { fetchBagItems, useBagItem, type BagItemData } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { QUALITY_COLOR_MAP } from '../../constants/quality';
import styles from './PageSkeleton.module.css';

const GRID_SIZE = 30;
const POSITION_LABELS: Record<number, string> = { 1: '武器', 2: '护甲', 3: '饰品' };

const TABS = [
  { key: '', label: '全部' },
  { key: 'equipment', label: '装备' },
  { key: 'consumable', label: '消耗品' },
  { key: 'other', label: '其他' },
];

export default function InventoryPage() {
  const [items, setItems] = useState<BagItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BagItemData | null>(null);
  const [operating, setOperating] = useState(false);
  const [tab, setTab] = useState('');
  const { navigateTo } = useGameStore();

  const loadBag = useCallback(() => {
    setLoading(true);
    fetchBagItems()
      .then((res) => setItems(res.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadBag(); }, [loadBag]);

  const handleUse = useCallback(async () => {
    if (!selected) return;
    setOperating(true);
    try {
      const res = await useBagItem(selected.id, selected.itemTypeId, 1);
      if (res.expGained) {
        toast.success(`获得经验 +${res.expGained}${res.levelsGained ? `，升级 +${res.levelsGained}！` : ''}`);
        if (res.currentLevel != null) {
          usePlayerStore.getState().setLevelInfo({
            level: res.currentLevel,
            exp: res.currentExp ?? 0,
            maxExp: res.maxExp ?? 0,
          });
        }
      } else {
        toast.success('使用成功');
      }
      setSelected(null);
      loadBag();
    } catch { /* noop */ }
    setOperating(false);
  }, [selected, loadBag]);

  const filtered = tab
    ? items.filter(i => {
        if (tab === 'equipment') return i.category === 'equipment';
        if (tab === 'consumable') return i.category === 'consumable';
        return i.category !== 'equipment' && i.category !== 'consumable';
      })
    : items;

  const slots: (BagItemData | null)[] = [...filtered];
  while (slots.length < GRID_SIZE) slots.push(null);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>背包</h2>
        <p className={styles.subtitle}>{items.length} 件物品</p>
      </div>

      <div className={styles.tabRow}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => { setTab(t.key); setSelected(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : (
          <>
            <div className={styles.inventoryGrid}>
              {slots.map((item, i) => (
                <button
                  key={item?.id ?? `empty-${i}`}
                  className={styles.itemSlot}
                  style={item ? {
                    border: selected?.id === item.id
                      ? '2px solid var(--gold)'
                      : `1px solid ${QUALITY_COLOR_MAP[item.quality ?? ''] || 'var(--paper-darker)'}`,
                    position: 'relative',
                    cursor: 'pointer',
                  } : undefined}
                  onClick={() => item && setSelected(item.id === selected?.id ? null : item)}
                >
                  {item && (
                    <>
                      <span style={{
                        fontSize: '20px', position: 'absolute',
                        top: '50%', left: '50%', transform: 'translate(-50%,-55%)',
                      }}>
                        {item.icon || '📦'}
                      </span>
                      {item.quantity > 1 && (
                        <span style={{
                          position: 'absolute', bottom: '1px', right: '3px',
                          fontSize: '9px', color: 'var(--gold-dim)', fontWeight: 700,
                        }}>
                          x{item.quantity}
                        </span>
                      )}
                      {item.category === 'equipment' && (
                        <span style={{
                          position: 'absolute', top: '1px', left: '2px',
                          fontSize: '7px', color: QUALITY_COLOR_MAP[item.quality ?? ''] || '#888',
                          fontWeight: 700,
                        }}>
                          {POSITION_LABELS[item.equipPosition ?? 0] || '装'}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* 选中物品详情 */}
            {selected && (
              <div style={{
                marginTop: '12px', padding: '12px', background: 'var(--paper-dark)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--paper-darker)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '24px' }}>{selected.icon || '📦'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '14px', fontWeight: 600,
                      color: QUALITY_COLOR_MAP[selected.quality ?? ''] || 'var(--ink)',
                    }}>
                      {selected.name || selected.itemTypeId}
                    </p>
                    {selected.quality && (
                      <span style={{
                        fontSize: '10px',
                        color: QUALITY_COLOR_MAP[selected.quality] || '#888',
                      }}>
                        {selected.quality}
                        {selected.equipPosition ? ` · ${POSITION_LABELS[selected.equipPosition] || '装备'}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                {selected.description && (
                  <p style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.6, marginTop: 6 }}>
                    {selected.description}
                  </p>
                )}
                {selected.category !== 'equipment' && (
                  <p style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.5, marginTop: 4 }}>
                    数量：{selected.quantity}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {selected.category === 'consumable' && (
                    <button className={styles.actionBtn} onClick={handleUse} disabled={operating}>
                      {operating ? '使用中...' : '使用'}
                    </button>
                  )}
                  {selected.equipId && (
                    <button
                      className={styles.actionBtn}
                      onClick={() => navigateTo('equip-detail', { equipId: selected.equipId })}
                    >
                      查看详情
                    </button>
                  )}
                  {selected.equipId && (
                    <button
                      className={styles.actionBtn}
                      style={{ background: 'var(--paper-darker)', color: 'var(--ink)' }}
                      onClick={() => navigateTo('enchant', { equipId: selected.equipId })}
                    >
                      附魔
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 空态引导 */}
            {items.length === 0 && !loading && (
              <div className={styles.empty}>
                <span className={styles.placeholderIcon}>🎒</span>
                <p>背包空空如也</p>
                <p className={styles.hint}>通过探索、战斗、商城获取物品</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className={styles.actionBtn} onClick={() => navigateTo('explore')}>
                    去探索
                  </button>
                  <button className={styles.actionBtn} onClick={() => navigateTo('shop')}
                    style={{ background: 'var(--paper-darker)', color: 'var(--ink)' }}>
                    去商城
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
