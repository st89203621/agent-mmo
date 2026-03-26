import React, { useEffect, useState, useCallback } from 'react';
import { fetchShopItems, fetchPlayerCurrency, purchaseItem, type ShopItemData } from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { QUALITY_COLOR_MAP } from '../../constants/quality';
import styles from './PageSkeleton.module.css';

const POSITION_LABELS: Record<number, string> = { 1: '武器', 2: '护甲', 3: '饰品' };

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'hot', label: '热销' },
  { key: 'equipment', label: '装备' },
  { key: 'consumable', label: '消耗品' },
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
  const [expanded, setExpanded] = useState<string | null>(null);

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
      const item = items.find(i => i.id === itemId);
      if (item?.equipPosition && item.equipPosition > 0) {
        toast.reward(`获得装备：${item.name}`);
      } else {
        toast.success('购买成功');
      }
      await loadData();
      const curRes = await fetchPlayerCurrency();
      usePlayerStore.getState().setCurrency(curRes.gold, curRes.diamond);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '购买失败');
    }
    setBuying(null);
  }, [loadData, items]);

  const qualityBorder = (q: string) => QUALITY_COLOR_MAP[q] || 'var(--paper-darker)';

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
            onClick={() => { setCategory(c.key); setExpanded(null); }}
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
            {items.map(item => {
              const isEquip = item.equipPosition && item.equipPosition > 0;
              const isExpanded = expanded === item.id;
              return (
                <div
                  key={item.id}
                  className={styles.card}
                  style={{
                    cursor: 'pointer',
                    borderLeft: `3px solid ${qualityBorder(item.quality)}`,
                  }}
                  onClick={() => setExpanded(isExpanded ? null : item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px' }}>{item.icon || '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <p className={styles.cardTitle} style={{ color: qualityBorder(item.quality) }}>
                          {item.name}
                        </p>
                        {isEquip && (
                          <span style={{
                            fontSize: '10px', padding: '1px 6px',
                            background: 'var(--paper-darker)', color: 'var(--ink)',
                            borderRadius: '999px', opacity: 0.7,
                          }}>
                            {POSITION_LABELS[item.equipPosition!] || '装备'}
                          </span>
                        )}
                        {item.isHot && (
                          <span style={{
                            fontSize: '10px', padding: '1px 6px', background: 'var(--red, #c44)',
                            color: '#fff', borderRadius: '999px', fontWeight: 600,
                          }}>热</span>
                        )}
                      </div>
                      <p className={styles.cardMeta}>
                        {CURRENCY_ICON[item.currency] || ''} {item.price}
                        {item.stock > 0 && item.stock < 100 ? ` · 库存${item.stock}` : ''}
                      </p>
                    </div>
                    <button
                      className={styles.actionBtn}
                      style={{ marginTop: 0, fontSize: '12px', padding: '6px 14px' }}
                      disabled={buying === item.id}
                      onClick={(e) => { e.stopPropagation(); handleBuy(item.id); }}
                    >
                      {buying === item.id ? '...' : '购买'}
                    </button>
                  </div>
                  {item.description && (
                    <p className={styles.cardDesc}>{item.description}</p>
                  )}

                  {/* 展开：显示属性 */}
                  {isExpanded && item.attributes && (
                    <div style={{
                      marginTop: '8px', padding: '8px',
                      background: 'var(--paper-dark)', borderRadius: 'var(--radius-sm)',
                      display: 'flex', flexWrap: 'wrap', gap: '8px 16px',
                    }}>
                      {Object.entries(item.attributes).map(([k, v]) => (
                        <span key={k} style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.8 }}>
                          {k} <span style={{ color: qualityBorder(item.quality), fontWeight: 600 }}>+{v}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
