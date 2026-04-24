import { useEffect, useState, useCallback } from 'react';
import { fetchBagItems, useBagItem, type BagItemData } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';

const GRID_SIZE = 20;

const TABS = [
  { key: '', label: '全部' },
  { key: 'equipment', label: '装备' },
  { key: 'consumable', label: '消耗' },
  { key: 'other', label: '其他' },
];

function qualityClass(q?: string) {
  if (q === 'orange') return styles.invOrange;
  if (q === 'purple') return styles.invPurple;
  if (q === 'blue') return styles.invBlue;
  if (q === 'green') return styles.invGreen;
  if (q === 'white') return styles.invWhite;
  return '';
}

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
      .then((res) => setItems(res.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBag();
  }, [loadBag]);

  const handleUse = useCallback(async () => {
    if (!selected) return;
    setOperating(true);
    try {
      const res = await useBagItem(selected.id, selected.itemTypeId, 1);
      if (res.currentLevel != null) {
        usePlayerStore.getState().setLevelInfo({
          level: res.currentLevel,
          exp: res.currentExp ?? 0,
          maxExp: res.maxExp ?? 0,
        });
      }
      toast.success(res.msg || '使用成功');
      setSelected(null);
      loadBag();
    } catch {
      toast.error('使用失败');
    }
    setOperating(false);
  }, [loadBag, selected]);

  const filtered = tab
    ? items.filter((item) => {
      if (tab === 'equipment') return item.category === 'equipment';
      if (tab === 'consumable') return item.category === 'consumable';
      return item.category !== 'equipment' && item.category !== 'consumable';
    })
    : items;

  const slots: (BagItemData | null)[] = [...filtered];
  while (slots.length < GRID_SIZE) slots.push(null);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>背 包</span>
            <span className={styles.appbarZone}>{items.length} 件物品 · 可从此装备/使用</span>
          </div>
        </div>
      </div>

      <div className={styles.invTabs}>
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`${styles.invTab} ${tab === item.key ? styles.invTabOn : ''}`.trim()}
            onClick={() => {
              setTab(item.key);
              setSelected(null);
            }}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.scrollPlain}>
        {loading ? (
          <div className={styles.feedEmpty}>背包载入中...</div>
        ) : (
          <>
            <div className={styles.invGrid}>
              {slots.map((item, index) => (
                <button
                  key={item?.id ?? `empty-${index}`}
                  className={`${styles.invSlot} ${item ? `${styles.invSlotHasItem} ${qualityClass(item.quality)}` : ''} ${selected?.id === item?.id ? styles.invSlotSelected : ''}`.trim()}
                  onClick={() => item && setSelected(item.id === selected?.id ? null : item)}
                  type="button"
                >
                  {item ? (item.icon || item.name?.slice(0, 1) || '物') : ''}
                  {item?.quantity && item.quantity > 1 && <span className={styles.invQty}>{item.quantity}</span>}
                  {item?.equipId && <span className={styles.invBind}>装</span>}
                </button>
              ))}
            </div>

            {selected && (
              <div className={styles.invDetail}>
                <div>
                  <span className={styles.invDetailName}>{selected.name || selected.itemTypeId}</span>
                  {selected.quality && <span className={styles.invDetailTag}>{selected.quality}</span>}
                  {selected.equipId && <span className={styles.invDetailBind}>[装备]</span>}
                </div>
                <div className={styles.invDetailLevel}>{selected.description || '暂无详细说明'}</div>
                <div className={styles.invDetailAttrs}>
                  <span>数量 <span className={styles.plusValue}>{selected.quantity}</span></span>
                  <span>类别 <span className={styles.plusValue}>{selected.category || 'other'}</span></span>
                  {selected.equipPosition && <span>部位 <span className={styles.plusValue}>{selected.equipPosition}</span></span>}
                </div>
                <div className={styles.invDetailOps}>
                  {(selected.effectType || selected.category === 'consumable') && !selected.equipId && (
                    <button className={styles.invOp} onClick={handleUse} disabled={operating} type="button">
                      {operating ? '...' : '使用'}
                    </button>
                  )}
                  {selected.equipId && (
                    <button className={`${styles.invOp} ${styles.invOpGold}`} onClick={() => navigateTo('character')} type="button">
                      装备
                    </button>
                  )}
                  {selected.equipId && (
                    <button className={styles.invOp} onClick={() => navigateTo('forge', { equipId: selected.equipId })} type="button">
                      鬼炉
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
