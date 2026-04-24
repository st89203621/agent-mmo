import { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import {
  fetchMarketItems, sellOnMarket, buyFromMarket,
  fetchMyMarketListings, cancelMarketListing,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import type { MarketListing } from '../../types';
import styles from './lunhui/LunhuiPages.module.css';

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'consumable', label: '消耗' },
  { key: 'material', label: '材料' },
  { key: 'equipment', label: '装备' },
  { key: 'pet', label: '宝宝' },
  { key: 'other', label: '任务' },
];

type Tab = 'market' | 'mine';

export default function TradePage() {
  const currentPage = useGameStore((s) => s.currentPage);
  const { gold } = usePlayerStore();
  const [tab, setTab] = useState<Tab>('market');
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [showSell, setShowSell] = useState(false);
  const [sellPrice, setSellPrice] = useState('');

  const isStallMode = currentPage === 'stall';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'mine') {
        const res = await fetchMyMarketListings();
        setItems(res.items || []);
      } else {
        const res = await fetchMarketItems(category || undefined, keyword || undefined);
        setItems(res.items || []);
      }
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [category, keyword, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBuy = useCallback(async (listing: MarketListing) => {
    setActing(listing.listingId);
    try {
      await buyFromMarket(listing.listingId);
      toast.reward(`购得 ${listing.itemName}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '购买失败');
    }
    setActing(null);
  }, [load]);

  const handleCancel = useCallback(async (listingId: string) => {
    setActing(listingId);
    try {
      await cancelMarketListing(listingId);
      toast.success('已撤回挂单');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '撤回失败');
    }
    setActing(null);
  }, [load]);

  const handleSell = useCallback(async () => {
    const price = parseInt(sellPrice, 10);
    if (isNaN(price) || price <= 0) {
      toast.error('请输入有效价格');
      return;
    }
    try {
      await sellOnMarket('selected', price, 1);
      toast.success('挂单成功');
      setShowSell(false);
      setSellPrice('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '挂单失败');
    }
  }, [load, sellPrice]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>{isStallMode ? '小 摊' : '集 市'}</span>
            <span className={styles.appbarZone}>{items.length} 项在售 · 金币 {gold.toLocaleString()}</span>
          </div>
          <div className={styles.appbarIcons}>
            <div className={styles.appbarIconPlain}>索</div>
            <div className={styles.appbarIconPlain}>袋</div>
          </div>
        </div>
      </div>

      <div className={styles.marketTabs}>
        {CATEGORIES.map((item) => (
          <button
            key={item.key}
            className={`${styles.marketTab} ${category === item.key ? styles.marketTabOn : ''}`.trim()}
            onClick={() => setCategory(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.marketMine}>
        <div className={styles.marketMineTitle}>{tab === 'mine' ? '我 的 摆 卖' : isStallMode ? '逛 摊 淘 宝' : '市 集 流 通'}</div>
        <div className={styles.marketMineSub}>
          {tab === 'mine' ? '查看自己的挂单并可随时撤回' : '支持按分类浏览和购买其他玩家上架物品'}
        </div>
        <div className={styles.marketMineActions}>
          <button className={styles.marketMineBtn} onClick={() => setTab(tab === 'market' ? 'mine' : 'market')} type="button">
            {tab === 'market' ? '我 的 挂 单' : '返 回 集 市'}
          </button>
          <button className={styles.marketMineBtn} onClick={() => setShowSell(true)} type="button">
            摆 摊 上 架
          </button>
        </div>
      </div>

      {!isStallMode && tab === 'market' && (
        <div className={styles.friendSearch}>
          <input
            className={styles.friendSearchInput}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="搜索物品名"
          />
          <button className={styles.friendSearchBtn} onClick={load} type="button">搜 索</button>
        </div>
      )}

      <div className={styles.scrollPlain}>
        {loading ? (
          <div className={styles.feedEmpty}>交易数据加载中...</div>
        ) : items.length === 0 ? (
          <div className={styles.feedEmpty}>当前没有可显示的交易条目</div>
        ) : (
          <div className={styles.marketList}>
            {items.map((item) => {
              const actingNow = acting === item.listingId;
              return (
                <div key={item.listingId} className={styles.marketStall}>
                  <div className={styles.marketAvatar}>{item.sellerName.slice(0, 2)}</div>
                  <div className={styles.marketBody}>
                    <div className={styles.marketName}>
                      {item.sellerName}
                      <span className={styles.marketZone}>{item.itemCategory || '主城 (2,2)'}</span>
                    </div>
                    <div className={styles.marketItems}>
                      · {item.itemName} × {item.quantity - item.sold} · <b>{item.unitPrice.toLocaleString()} 币/件</b>
                    </div>
                  </div>
                  {tab === 'mine' ? (
                    <button className={styles.marketGo} disabled={actingNow} onClick={() => handleCancel(item.listingId)} type="button">
                      {actingNow ? '...' : '撤'}
                    </button>
                  ) : (
                    <button className={styles.marketGo} disabled={actingNow} onClick={() => handleBuy(item)} type="button">
                      {actingNow ? '...' : '逛'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSell && (
        <div className={styles.overlayMask} onClick={() => setShowSell(false)}>
          <div className={styles.overlayPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.overlayTitle}>摆 摊 上 架</div>
            <div className={styles.overlayText}>输入单价，默认上架 1 件示例物品</div>
            <input className={styles.overlayInput} type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="单价" />
            <button className={styles.overlayPrimary} onClick={handleSell} type="button">确 认 摆 卖</button>
          </div>
        </div>
      )}
    </div>
  );
}
