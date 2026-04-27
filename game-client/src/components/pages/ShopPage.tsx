import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchShopItems,
  fetchPlayerCurrency,
  purchaseItem,
  type ShopItemData,
} from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const TABS: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'hot', label: '热销' },
  { key: 'equipment', label: '装备' },
  { key: 'consumable', label: '丹药' },
  { key: 'material', label: '材料' },
  { key: 'special', label: '特殊' },
];

const POSITION_LABEL: Record<number, string> = {
  1: '武器', 2: '护甲', 3: '饰品', 4: '护腕', 5: '战靴', 6: '戒指', 7: '项链', 8: '腰带',
};

const QUALITY_TAG: Record<string, string> = {
  legendary: '顶档',
  epic: '稀有',
  rare: '精良',
  uncommon: '良品',
  common: '普品',
};

const CURRENCY_UNIT: Record<string, string> = {
  gold: '金币',
  diamond: '玩币',
};

function isVip(item: ShopItemData) {
  return item.quality === 'legendary' || item.quality === 'epic';
}

function itemIconChar(item: ShopItemData): string {
  if (item.icon && !/^\p{Emoji}$/u.test(item.icon)) return item.icon;
  return (item.name || item.id).slice(0, 1);
}

export default function ShopPage() {
  usePageBackground(PAGE_BG.SHOP);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const setCurrencyStore = usePlayerStore((s) => s.setCurrency);
  const [items, setItems] = useState<ShopItemData[]>([]);
  const [currency, setCurrency] = useState({ gold: 0, diamond: 0 });
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const res = await fetchShopItems(tab || undefined).catch(() => ({ items: [] as ShopItemData[] }));
    setItems(res.items || []);
  }, [tab]);

  const loadCurrency = useCallback(async () => {
    const cur = await fetchPlayerCurrency().catch(() => ({ gold: 0, diamond: 0 }));
    setCurrency(cur);
    setCurrencyStore(cur.gold, cur.diamond);
  }, [setCurrencyStore]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadItems(), loadCurrency()]).finally(() => setLoading(false));
  }, [loadItems, loadCurrency]);

  const handleBuy = useCallback(async (item: ShopItemData, evt?: React.MouseEvent) => {
    evt?.stopPropagation();
    setBuying(item.id);
    try {
      const result = await purchaseItem(item.id);
      if (result && result.success === false) {
        toast.error((result.message as string) || '购买失败');
      } else if (item.equipPosition && item.equipPosition > 0) {
        toast.reward(`获得装备 · ${item.name}`);
      } else {
        toast.reward(`购得 · ${item.name}`);
      }
      await Promise.all([loadItems(), loadCurrency()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '购买失败');
    }
    setBuying(null);
  }, [loadItems, loadCurrency]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.isHot !== b.isHot) return a.isHot ? -1 : 1;
      return b.price - a.price;
    });
  }, [items]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>商 城</span>
            <span className={styles.appbarZone}>玩币消费</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('mail')} type="button" aria-label="订单">单</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('ranking')} type="button" aria-label="榜单">榜</button>
          </div>
        </div>
      </div>

      <div className={styles.shopHero}>
        <div className={styles.shopMine}>
          <div>
            <div className={styles.shopMineK}>我的货币</div>
            <div className={styles.shopMineV}>
              <span>{currency.diamond.toLocaleString()} 玩币</span>
              <span className={styles.shopMineSplit}>/</span>
              <span>{currency.gold.toLocaleString()} 金币</span>
            </div>
          </div>
          <button className={styles.shopTopup} onClick={() => toast.info('充值入口筹备中')} type="button">
            ＋ 充 值
          </button>
        </div>
        <div className={styles.shopChips}>
          {TABS.map((t) => (
            <button
              key={t.key || 'all'}
              className={`${styles.shopChip} ${tab === t.key ? styles.shopChipOn : ''}`.trim()}
              onClick={() => { setTab(t.key); setExpanded(null); }}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.shopList}>
        {loading ? (
          <div className={styles.feedEmpty}>商品载入中...</div>
        ) : sorted.length === 0 ? (
          <div className={styles.feedEmpty}>此分类暂无上架商品</div>
        ) : (
          sorted.map((item) => {
            const vip = isVip(item);
            const opened = expanded === item.id;
            const canAfford = item.currency === 'diamond'
              ? currency.diamond >= item.price
              : currency.gold >= item.price;
            const classes = [
              styles.shopItem,
              vip ? styles.shopItemVip : '',
              item.isHot ? styles.shopItemHot : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={item.id}
                className={classes}
                onClick={() => setExpanded(opened ? null : item.id)}
                type="button"
              >
                <div className={styles.shopItemIc}>{itemIconChar(item)}</div>
                <div className={styles.shopItemInfo}>
                  <div className={styles.shopItemNm}>
                    {item.name}
                    {item.isHot && <span className={styles.shopItemTag}>热销</span>}
                    {QUALITY_TAG[item.quality] && (
                      <span className={`${styles.shopItemTag} ${styles.shopItemTagGold}`}>
                        {QUALITY_TAG[item.quality]}
                      </span>
                    )}
                    {item.equipPosition != null && item.equipPosition > 0 && (
                      <span className={`${styles.shopItemTag} ${styles.shopItemTagGold}`}>
                        {POSITION_LABEL[item.equipPosition] || '装备'}
                      </span>
                    )}
                  </div>
                  {item.description && <div className={styles.shopItemDs}>{item.description}</div>}
                </div>
                <div className={styles.shopItemBuy}>
                  <span className={styles.shopItemP}>{item.price.toLocaleString()}</span>
                  <span className={styles.shopItemU}>{CURRENCY_UNIT[item.currency] || item.currency}</span>
                  <button
                    className={styles.shopItemB}
                    onClick={(e) => handleBuy(item, e)}
                    disabled={buying === item.id || !canAfford || item.stock === 0}
                    type="button"
                  >
                    {buying === item.id ? '...' : (!canAfford ? '不足' : '购买')}
                  </button>
                </div>
                {opened && item.attributes && Object.keys(item.attributes).length > 0 && (
                  <div className={styles.shopItemAttrs}>
                    {Object.entries(item.attributes).map(([k, v]) => (
                      <span key={k}>{k}<b>+{v}</b></span>
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
