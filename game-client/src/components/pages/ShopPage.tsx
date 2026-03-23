import React, { useEffect, useState, useCallback } from 'react';
import { fetchShopItems, fetchPlayerCurrency, purchaseItem, type ShopItemData } from '../../services/api';
import styles from './PageSkeleton.module.css';

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'consumable', label: '消耗品' },
  { key: 'equipment', label: '装备' },
  { key: 'material', label: '材料' },
  { key: 'special', label: '特殊' },
];

const CURRENCY_ICON: Record<string, string> = { gold: '🪙', diamond: '💎' };

export default function ShopPage() {
  const [items, setItems] = useState<ShopItemData[]>([]);
  const [currency, setCurrency] = useState({ gold: 0, diamond: 0 });
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [shopRes, curRes] = await Promise.all([
        fetchShopItems(category || undefined),
        fetchPlayerCurrency(),
      ]);
      setItems(shopRes.items || []);
      setCurrency(curRes);
    } catch { /* noop */ }
    setLoading(false);
  }, [category]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBuy = useCallback(async (itemId: string) => {
    setBuying(itemId);
    try {
      await purchaseItem(itemId);
      await loadData();
    } catch { /* noop */ }
    setBuying(null);
  }, [loadData]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>商城</h2>
        <p className={styles.subtitle}>🪙 {currency.gold}　💎 {currency.diamond}</p>
      </div>

      <div className={styles.tabRow}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            className={`${styles.tab} ${category === c.key ? styles.tabActive : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : items.length > 0 ? (
          <div className={styles.cardList}>
            {items.map(item => (
              <div key={item.id} className={styles.card} style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>{item.icon || '📦'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p className={styles.cardTitle}>{item.name}</p>
                      {item.isHot && (
                        <span style={{
                          fontSize: '10px', padding: '1px 6px', background: 'var(--red, #c44)',
                          color: '#fff', borderRadius: '999px', fontWeight: 600,
                        }}>热</span>
                      )}
                    </div>
                    <p className={styles.cardMeta}>
                      {CURRENCY_ICON[item.currency] || ''} {item.price}
                      {item.stock > 0 ? ` · 库存${item.stock}` : ''}
                    </p>
                  </div>
                  <button
                    className={styles.actionBtn}
                    style={{ marginTop: 0, fontSize: '12px', padding: '6px 14px' }}
                    disabled={buying === item.id}
                    onClick={() => handleBuy(item.id)}
                  >
                    {buying === item.id ? '...' : '购买'}
                  </button>
                </div>
                {item.description && (
                  <p className={styles.cardDesc}>{item.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>🏪</span>
            <p>暂无商品</p>
          </div>
        )}
      </div>
    </div>
  );
}
