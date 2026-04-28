import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchBagItems, useBagItem, type BagItemData, type BagCapacity } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { Bar } from '../common/fusion';
import EmptyState from '../common/EmptyState';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const TABS: { key: string; label: string; match: (item: BagItemData) => boolean }[] = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'equipment', label: '装备', match: (i) => i.category === 'equipment' },
  { key: 'consumable', label: '丹药', match: (i) => i.category === 'consumable' },
  { key: 'material', label: '材料', match: (i) => i.category === 'material' },
  { key: 'pet', label: '宝宝', match: (i) => i.category === 'pet' },
  { key: 'other', label: '其他', match: (i) => !['equipment', 'consumable', 'material', 'pet'].includes(i.category || '') },
];

function qualityClass(q?: string) {
  switch (q) {
    case 'orange': return styles.invOrange;
    case 'purple': return styles.invPurple;
    case 'blue': return styles.invBlue;
    case 'green': return styles.invGreen;
    case 'white': return styles.invWhite;
    default: return '';
  }
}

const EQUIP_POSITION_LABEL: Record<number, string> = {
  1: '武器', 2: '头盔', 3: '战甲', 4: '护腕', 5: '战靴', 6: '戒指', 7: '项链', 8: '腰带',
};

export default function InventoryPage() {
  usePageBackground(PAGE_BG.INVENTORY);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [items, setItems] = useState<BagItemData[]>([]);
  const [capacity, setCapacity] = useState<BagCapacity | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BagItemData | null>(null);
  const [operating, setOperating] = useState(false);
  const [tab, setTab] = useState('all');

  const loadBag = useCallback(() => {
    setLoading(true);
    fetchBagItems()
      .then((res) => {
        setItems(res.items || []);
        setCapacity(res.capacity || null);
      })
      .catch(() => {
        setItems([]);
        setCapacity(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadBag(); }, [loadBag]);

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

  const filtered = useMemo(() => {
    const tabDef = TABS.find((t) => t.key === tab) ?? TABS[0];
    return items.filter(tabDef.match);
  }, [items, tab]);

  const usedCount = capacity?.used ?? items.length;
  const maxCount = capacity?.max ?? Math.max(items.length, 40);
  // 自适应：实际物品数 + 至多 4 个空槽（提示还可以装更多），上限 20
  const minSlots = Math.min(20, filtered.length + 4);
  const slots: (BagItemData | null)[] = [...filtered];
  while (slots.length < minSlots) slots.push(null);
  const bagEmpty = !loading && items.length === 0;

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>背 包</span>
            <span className={styles.appbarZone}>道具 · 装备</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('market')} type="button">售</button>
            <button className={styles.appbarIcon} onClick={loadBag} type="button" aria-label="整理">整</button>
          </div>
        </div>
      </div>

      {!bagEmpty && (
        <>
          <div className={`${styles.invTabs} ${styles.invTabsScroller}`}>
            {TABS.map((item) => (
              <button
                key={item.key}
                className={`${styles.invTab} ${tab === item.key ? styles.invTabOn : ''}`.trim()}
                onClick={() => { setTab(item.key); setSelected(null); }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={styles.invCapbar}>
            <span className={styles.capLabel}>容量</span>
            <span className={styles.capValue}>{usedCount} / {maxCount}</span>
            <Bar kind="gold" current={usedCount} max={maxCount} />
            <button className={styles.invCapExt} onClick={() => toast.info('扩容卡暂未开放')} type="button">＋ 扩容卡</button>
          </div>
        </>
      )}

      <div className={styles.scrollPlain}>
        {loading ? (
          <div className={styles.feedEmpty}>背包载入中...</div>
        ) : bagEmpty ? (
          <EmptyState
            icon="囊"
            title="行囊空空"
            hint={<>江湖路远，先去打打怪积攒些物什。<br />探索、副本、任务皆可获得。</>}
            action={
              <button
                onClick={() => navigateTo('scene')}
                type="button"
                style={{
                  padding: '10px 24px',
                  border: '1px solid var(--gold)',
                  color: 'var(--gold)',
                  background: 'transparent',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 14,
                  letterSpacing: 3,
                }}
              >
                去 主 城
              </button>
            }
          />
        ) : (
          <>
            <div className={styles.invGrid}>
              {slots.map((item, index) => (
                <button
                  key={item?.id ?? `empty-${index}`}
                  className={`${styles.invSlot} ${item ? `${styles.invSlotHasItem} ${qualityClass(item.quality)}` : ''} ${selected?.id === item?.id ? styles.invSlotSelected : ''}`.trim()}
                  onClick={() => item && setSelected(item.id === selected?.id ? null : item)}
                  type="button"
                  disabled={!item}
                >
                  {item ? (item.icon || item.name?.slice(0, 1) || '物') : ''}
                  {item && item.quantity > 1 && <span className={styles.invQty}>{item.quantity}</span>}
                  {item?.equipId && <span className={styles.invBind}>绑</span>}
                </button>
              ))}
            </div>

            {selected && (
              <div className={styles.invDetail}>
                <div>
                  <span className={styles.invDetailName}>{selected.name || selected.itemTypeId}</span>
                  {selected.quality && <span className={styles.invDetailTag}>{selected.quality}</span>}
                  {selected.equipId && <span className={styles.invDetailBind}>[已绑]</span>}
                </div>
                <div className={styles.invDetailLevel}>
                  {selected.description || '暂无详细说明'}
                </div>
                <div className={styles.invDetailAttrs}>
                  <span>数量 <span className={styles.plusValue}>{selected.quantity}</span></span>
                  {selected.category && <span>类别 <span className={styles.plusValue}>{selected.category}</span></span>}
                  {selected.equipPosition != null && (
                    <span>部位 <span className={styles.plusValue}>{EQUIP_POSITION_LABEL[selected.equipPosition] || selected.equipPosition}</span></span>
                  )}
                </div>
                <div className={styles.invDetailOps}>
                  {(selected.effectType || selected.category === 'consumable') && !selected.equipId && (
                    <button className={styles.invOp} onClick={handleUse} disabled={operating} type="button">
                      {operating ? '...' : '使用'}
                    </button>
                  )}
                  {selected.equipId && (
                    <>
                      <button className={styles.invOp} onClick={() => navigateTo('character')} type="button">装备</button>
                      <button className={`${styles.invOp} ${styles.invOpGold}`} onClick={() => navigateTo('forge', { equipId: selected.equipId })} type="button">神匠</button>
                      <button className={`${styles.invOp} ${styles.invOpGold}`} onClick={() => navigateTo('enchant', { equipId: selected.equipId })} type="button">附魂</button>
                      <button className={`${styles.invOp} ${styles.invOpRed}`} onClick={() => toast.info('典当功能开发中')} type="button">典当</button>
                    </>
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
