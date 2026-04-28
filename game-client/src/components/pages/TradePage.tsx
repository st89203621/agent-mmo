import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import {
  fetchMarketItems, sellOnMarket, buyFromMarket,
  fetchMyMarketListings, cancelMarketListing,
  fetchBagItems, type BagItemData,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import type { MarketListing } from '../../types';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';
import EmptyState from '../common/EmptyState';

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'consumable', label: '消耗' },
  { key: 'material', label: '材料' },
  { key: 'equipment', label: '装备' },
  { key: 'pet', label: '宝宝' },
  { key: 'quest', label: '任务' },
];

type Tab = 'market' | 'mine';

const STALL_CAPACITY = 8;

export default function TradePage() {
  usePageBackground(PAGE_BG.TRADE);
  const currentPage = useGameStore((s) => s.currentPage);
  const { gold } = usePlayerStore();

  const [tab, setTab] = useState<Tab>('market');
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<MarketListing[]>([]);
  const [myListings, setMyListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const [showSell, setShowSell] = useState(false);
  const [bagItems, setBagItems] = useState<BagItemData[]>([]);
  const [bagLoading, setBagLoading] = useState(false);
  const [pickedBagId, setPickedBagId] = useState<string | null>(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellQty, setSellQty] = useState('1');

  const isStallMode = currentPage === 'stall';

  const loadMarket = useCallback(async () => {
    const res = await fetchMarketItems(category || undefined, keyword || undefined).catch(() => ({ items: [] as MarketListing[], total: 0 }));
    setItems(res.items || []);
  }, [category, keyword]);

  const loadMine = useCallback(async () => {
    const res = await fetchMyMarketListings().catch(() => ({ items: [] as MarketListing[] }));
    setMyListings(res.items || []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMarket(), loadMine()]);
    setLoading(false);
  }, [loadMarket, loadMine]);

  useEffect(() => { load(); }, [load]);

  const displayList = tab === 'mine' ? myListings : items;

  const handleBuy = useCallback(async (listing: MarketListing) => {
    setActing(listing.listingId);
    try {
      await buyFromMarket(listing.listingId);
      toast.reward(`购得 ${listing.itemName}`);
      await loadMarket();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '购买失败');
    }
    setActing(null);
  }, [loadMarket]);

  const handleCancel = useCallback(async (listing: MarketListing) => {
    setActing(listing.listingId);
    try {
      await cancelMarketListing(listing.listingId);
      toast.success('已撤回挂单');
      await loadMine();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '撤回失败');
    }
    setActing(null);
  }, [loadMine]);

  const openSellPanel = useCallback(async () => {
    setShowSell(true);
    setBagLoading(true);
    try {
      const res = await fetchBagItems();
      const sellable = (res.items || []).filter((it) => !it.equipId);
      setBagItems(sellable);
    } catch {
      setBagItems([]);
    }
    setBagLoading(false);
  }, []);

  const closeSellPanel = useCallback(() => {
    setShowSell(false);
    setPickedBagId(null);
    setSellPrice('');
    setSellQty('1');
  }, []);

  const pickedBagItem = useMemo(
    () => bagItems.find((it) => it.id === pickedBagId) ?? null,
    [bagItems, pickedBagId],
  );

  const handleConfirmSell = useCallback(async () => {
    if (!pickedBagItem) { toast.error('请先选择物品'); return; }
    const price = Number.parseInt(sellPrice, 10);
    const qty = Number.parseInt(sellQty, 10);
    if (!Number.isFinite(price) || price <= 0) { toast.error('请输入有效单价'); return; }
    if (!Number.isFinite(qty) || qty <= 0 || qty > pickedBagItem.quantity) {
      toast.error(`数量需为 1~${pickedBagItem.quantity}`);
      return;
    }
    try {
      await sellOnMarket(pickedBagItem.id, price, qty);
      toast.success('已挂单');
      closeSellPanel();
      await load();
      setTab('mine');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '挂单失败');
    }
  }, [closeSellPanel, load, pickedBagItem, sellPrice, sellQty]);

  const myStallActive = myListings.length > 0;

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>{isStallMode ? '小 摊' : '集 市'}</span>
            <span className={styles.appbarZone}>
              {tab === 'mine' ? `我挂 ${myListings.length} 件` : `${items.length} 摊在摆`} · 金币 {gold.toLocaleString()}
            </span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={load} type="button">索</button>
            <button className={styles.appbarIcon} onClick={() => setTab(tab === 'market' ? 'mine' : 'market')} type="button">袋</button>
          </div>
        </div>
      </div>

      <div className={styles.marketMine}>
        <div className={styles.marketMineTitle}>
          我 的 小 摊 · {myStallActive ? '营 业 中' : '打 烊 中'}
        </div>
        <div className={styles.marketMineSub}>
          {myStallActive
            ? `已上架 ${myListings.length}/${STALL_CAPACITY} 件 · 无手续费`
            : `未摆摊 · 可从背包挑 ${STALL_CAPACITY} 件定价售出 · 无手续费`}
        </div>
        <div className={styles.marketMineActions}>
          <button
            className={styles.marketMineBtn}
            onClick={() => setTab(tab === 'market' ? 'mine' : 'market')}
            type="button"
          >
            {tab === 'market' ? '查 看 我 的 挂 单' : '返 回 集 市'}
          </button>
          <button
            className={styles.marketMineBtn}
            onClick={openSellPanel}
            type="button"
          >
            ＋ {myStallActive ? '继 续 上 架' : '摆 摊 开 张'}
          </button>
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

      {tab === 'market' && (
        <div className={styles.friendSearch}>
          <input
            className={styles.friendSearchInput}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMarket()}
            placeholder="搜索物品名"
          />
          <button className={styles.friendSearchBtn} onClick={loadMarket} type="button">搜 索</button>
        </div>
      )}

      <div className={styles.scrollPlain}>
        {loading ? (
          <EmptyState icon="◷" title="交易载入中" hint="集市档口正在清点物什…" />
        ) : displayList.length === 0 ? (
          tab === 'mine' ? (
            <EmptyState
              icon="摊"
              title="虚位以待"
              hint={<>集市方寸之地，等你摆摊兴市。<br/>从背包挑几件物什定价售出，无需手续费。</>}
              action={
                <button className={styles.marketMineBtn} onClick={openSellPanel} type="button">
                  ＋ 摆 摊 开 张
                </button>
              }
            />
          ) : (
            <EmptyState
              icon="集"
              title="集市冷清"
              hint={<>当前无侠客挂单 · 不如先开个小摊？<br/>切换分类或换关键词或可发现遗珠。</>}
              action={
                <button className={styles.marketMineBtn} onClick={openSellPanel} type="button">
                  ＋ 摆 摊 开 张
                </button>
              }
            />
          )
        ) : (
          <div className={styles.marketList}>
            {displayList.map((item) => {
              const actingNow = acting === item.listingId;
              const remaining = Math.max(0, item.quantity - item.sold);
              return (
                <div key={item.listingId} className={styles.marketStall}>
                  <div className={styles.marketAvatar}>{(item.sellerName || '侠').slice(0, 2)}</div>
                  <div className={styles.marketBody}>
                    <div className={styles.marketName}>
                      {item.sellerName}
                      <span className={styles.marketZone}>{item.itemCategory || '主城 (2,2)'}</span>
                    </div>
                    <div className={styles.marketItems}>
                      · {item.itemName} × {remaining} · <b>{item.unitPrice.toLocaleString()} 币/件</b>
                    </div>
                  </div>
                  {tab === 'mine' ? (
                    <button
                      className={styles.marketGo}
                      disabled={actingNow}
                      onClick={() => handleCancel(item)}
                      type="button"
                    >
                      {actingNow ? '...' : '撤'}
                    </button>
                  ) : (
                    <button
                      className={styles.marketGo}
                      disabled={actingNow || remaining <= 0}
                      onClick={() => handleBuy(item)}
                      type="button"
                    >
                      {actingNow ? '...' : '买'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSell && (
        <div className={styles.overlayMask} onClick={closeSellPanel}>
          <div className={styles.overlayPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.overlayTitle}>摆 摊 上 架</div>
            <div className={styles.overlayText}>
              从背包中挑选物品，设置单价和数量
            </div>

            <div style={{ maxHeight: 180, overflowY: 'auto', margin: '10px 0', border: '1px solid var(--border)' }}>
              {bagLoading ? (
                <div className={styles.feedEmpty}>背包加载中...</div>
              ) : bagItems.length === 0 ? (
                <div className={styles.feedEmpty}>背包中没有可挂卖的物品</div>
              ) : (
                bagItems.map((it) => {
                  const on = it.id === pickedBagId;
                  return (
                    <button
                      key={it.id}
                      className={styles.marketStall}
                      style={{ width: '100%', background: on ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => {
                        setPickedBagId(it.id);
                        setSellQty(String(Math.min(it.quantity, 1)));
                      }}
                      type="button"
                    >
                      <div className={styles.marketAvatar} style={{ width: 36, height: 36, fontSize: 16 }}>
                        {it.icon || it.name?.slice(0, 1) || '物'}
                      </div>
                      <div className={styles.marketBody}>
                        <div className={styles.marketName}>
                          {it.name || it.itemTypeId}
                          {it.quality && <span className={styles.marketZone}>{it.quality}</span>}
                        </div>
                        <div className={styles.marketItems}>
                          · 持有 × {it.quantity}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <input
              className={styles.overlayInput}
              type="number"
              min={1}
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="单价（金币）"
            />
            <input
              className={styles.overlayInput}
              type="number"
              min={1}
              max={pickedBagItem?.quantity ?? 1}
              value={sellQty}
              onChange={(e) => setSellQty(e.target.value)}
              placeholder={pickedBagItem ? `数量（1~${pickedBagItem.quantity}）` : '数量'}
            />
            <button className={styles.overlayPrimary} onClick={handleConfirmSell} type="button" disabled={!pickedBagItem}>
              确 认 摆 卖
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
