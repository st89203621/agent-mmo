import { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchMarketItems, sellOnMarket, buyFromMarket,
  fetchMyMarketListings, cancelMarketListing,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import type { MarketListing } from '../../types';
import page from '../../styles/page.module.css';

const CATEGORIES = [
  { key: '',          label: '全部' },
  { key: 'weapon',    label: '武器' },
  { key: 'armor',     label: '防具' },
  { key: 'accessory', label: '饰品' },
  { key: 'pet',       label: '宠物' },
  { key: 'material',  label: '材料' },
  { key: 'misc',      label: '道具' },
];

const QUALITY_CLASS: Record<string, string> = {
  white:  page.qWhite,
  green:  page.qGreen,
  blue:   page.qBlue,
  purple: page.qPurple,
  orange: page.qOrange,
};

type Tab = 'market' | 'mine';

export default function TradePage() {
  const { gold } = usePlayerStore();
  const [tab, setTab] = useState<Tab>('market');
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [showSell, setShowSell] = useState(false);
  const [sellPrice, setSellPrice] = useState('');

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
    } catch { setItems([]); }
    setLoading(false);
  }, [tab, category, keyword]);

  useEffect(() => { load(); }, [load]);

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
    if (isNaN(price) || price <= 0) { toast.error('请输入有效价格'); return; }
    try {
      await sellOnMarket('selected', price, 1);
      toast.success('挂单成功');
      setShowSell(false);
      setSellPrice('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '挂单失败');
    }
  }, [sellPrice, load]);

  return (
    <div className={page.page}>
      <div className={page.header}>
        <p className={page.subtitle}>🪙 {gold.toLocaleString()} · 玩家间自由交易</p>
      </div>

      <div className={page.tabRow}>
        {(['market', 'mine'] as Tab[]).map(t => (
          <button
            key={t}
            className={`${page.tab} ${tab === t ? page.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'market' ? '集市' : '我的挂单'}
          </button>
        ))}
      </div>

      {tab === 'market' && (
        <>
          <div className={page.searchRow}>
            <div className={page.chipRow}>
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={`${page.chip} ${category === c.key ? page.chipActive : ''}`}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className={page.searchRow}>
            <input
              className={page.input}
              placeholder="搜索物品名称…"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
          </div>
        </>
      )}

      <div className={page.scrollArea}>
        {tab === 'mine' && (
          <button className={page.dashedBtn} onClick={() => setShowSell(true)}>
            + 挂单出售物品
          </button>
        )}

        {loading ? (
          <div className={page.empty}><p>加载中…</p></div>
        ) : items.length === 0 ? (
          <div className={page.empty}>
            <span className={page.placeholderIcon}>🏪</span>
            <p>{tab === 'mine' ? '暂无挂单' : '集市暂无商品'}</p>
            {tab === 'market' && <span className={page.hint}>去背包选择物品挂单，赚取差价</span>}
          </div>
        ) : items.map(item => {
          const qClass = QUALITY_CLASS[item.itemQuality] || page.qWhite;
          const isActing = acting === item.listingId;
          const remaining = item.quantity - item.sold;
          return (
            <div key={item.listingId} className={page.card}>
              <div className={page.cardHeader}>
                <span className={`${page.cardTitle} ${qClass}`}>{item.itemName}</span>
                <span className={page.cardMeta}>{item.sellerName}</span>
              </div>

              <div className={page.cardRow}>
                <div className={page.priceBlock}>
                  <span className={page.priceLabel}>单价</span>
                  <span className={page.priceValue}>🪙 {item.unitPrice.toLocaleString()}</span>
                </div>
                <span className={page.cardMeta}>剩 {remaining} 件</span>
              </div>

              <div className={page.actionRow}>
                {tab === 'market' ? (
                  <button
                    className={page.primaryBtn}
                    disabled={isActing}
                    onClick={() => handleBuy(item)}
                  >
                    {isActing ? '…' : '购买'}
                  </button>
                ) : (
                  <button
                    className={page.dangerBtn}
                    disabled={isActing}
                    onClick={() => handleCancel(item.listingId)}
                  >
                    {isActing ? '…' : '撤回'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 挂单抽屉 */}
      {showSell && (
        <div className={page.drawerOverlay} onClick={() => setShowSell(false)}>
          <div className={page.drawer} onClick={e => e.stopPropagation()}>
            <div className={page.drawerTitle}>挂单出售</div>
            <div className={page.drawerHint}>从背包选择物品，设置单价</div>

            <div className={page.field}>
              <label className={page.fieldLabel}>单价（金币）</label>
              <input
                className={page.input}
                type="number"
                placeholder="输入价格"
                value={sellPrice}
                onChange={e => setSellPrice(e.target.value)}
              />
            </div>

            <button className={page.drawerSubmit} onClick={handleSell}>确认挂单</button>
            <button className={page.drawerCancel} onClick={() => setShowSell(false)}>取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
