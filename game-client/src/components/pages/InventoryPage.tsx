import React, { useEffect, useState, useCallback } from 'react';
import { fetchBagItems, useBagItem, type BagItemData } from '../../services/api';
import styles from './PageSkeleton.module.css';

const GRID_SIZE = 30;

export default function InventoryPage() {
  const [items, setItems] = useState<BagItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BagItemData | null>(null);
  const [operating, setOperating] = useState(false);

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
      await useBagItem(selected.id, selected.itemTypeId, 1);
      setSelected(null);
      loadBag();
    } catch { /* noop */ }
    setOperating(false);
  }, [selected, loadBag]);

  const slots: (BagItemData | null)[] = [...items];
  while (slots.length < GRID_SIZE) slots.push(null);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>背包</h2>
        <p className={styles.subtitle}>{items.length} / {GRID_SIZE}</p>
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
                  style={
                    item
                      ? {
                          border: selected?.id === item.id ? '2px solid var(--gold)' : undefined,
                          position: 'relative', cursor: 'pointer',
                        }
                      : undefined
                  }
                  onClick={() => item && setSelected(item.id === selected?.id ? null : item)}
                >
                  {item && (
                    <>
                      <span style={{ fontSize: '16px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'var(--ink)' }}>
                        {item.itemTypeId.charAt(0).toUpperCase()}
                      </span>
                      {item.quantity > 1 && (
                        <span style={{
                          position: 'absolute', bottom: '1px', right: '3px',
                          fontSize: '9px', color: 'var(--gold-dim)', fontWeight: 700,
                        }}>
                          x{item.quantity}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>

            {selected && (
              <div style={{
                marginTop: '12px', padding: '12px', background: 'var(--paper-dark)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--paper-darker)',
              }}>
                <p style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 600 }}>
                  {selected.itemTypeId}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.5, marginTop: '4px' }}>
                  数量：{selected.quantity}
                </p>
                <button className={styles.actionBtn} onClick={handleUse} disabled={operating} style={{ marginTop: '8px' }}>
                  {operating ? '使用中...' : '使用'}
                </button>
              </div>
            )}

            {items.length === 0 && !loading && (
              <div className={styles.empty}>
                <span className={styles.placeholderIcon}>🎒</span>
                <p>背包空空如也</p>
                <p className={styles.hint}>通过探索和对话获取物品</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
