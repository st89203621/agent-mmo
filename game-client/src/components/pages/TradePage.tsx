import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchMarketItems, sellOnMarket, buyFromMarket,
  fetchMyMarketListings, cancelMarketListing,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import type { MarketListing } from '../../types';
import page from '../../styles/page.module.css';

const CATEGORIES = [
  { key: '',           label: '全部' },
  { key: 'weapon',     label: '武器' },
  { key: 'armor',      label: '防具' },
  { key: 'accessory',  label: '饰品' },
  { key: 'pet',        label: '宠物' },
  { key: 'material',   label: '材料' },
  { key: 'misc',       label: '道具' },
];

const QUALITY_COLOR: Record<string, string> = {
  white: '#ccc', green: '#6ecf6e', blue: '#6eadef',
  purple: '#c97ef0', orange: '#f0a83c', legendary: '#ff6060',
};

export default function TradePage() {
  const navigateTo = useGameStore(s => s.navigateTo);
  const { gold } = usePlayerStore();
  const [tab, setTab] = useState<'market' | 'mine'>('market');
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
      toast.reward(`购买成功：${listing.itemName}`);
      await load();
    } catch (e: unknown) {
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '撤回失败');
    }
    setActing(null);
  }, [load]);

  const handleSell = useCallback(async () => {
    const price = parseInt(sellPrice, 10);
    if (isNaN(price) || price <= 0) { toast.error('请输入有效价格'); return; }
    try {
      await sellOnMarket('selected', price, 1);
      toast.success('挂单成功！');
      setShowSell(false);
      setSellPrice('');
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '挂单失败');
    }
  }, [sellPrice, load]);

  return (
    <div className={page.page} style={{ position: 'relative' }}>
      <div className={page.header}>
        <button
          onClick={() => navigateTo('scene')}
          style={{ position: 'absolute', left: 16, top: 16, background: 'none', border: 'none', color: 'var(--ink)', opacity: 0.5, fontSize: 20, cursor: 'pointer' }}
        >←</button>
        <h2 className={page.title}>集市</h2>
        <p className={page.subtitle}>🪙 {gold} · 玩家间自由交易</p>
      </div>

      {/* 主 Tab */}
      <div className={page.tabRow}>
        {(['market', 'mine'] as const).map(t => (
          <button
            key={t}
            className={`${page.tab} ${tab === t ? page.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'market' ? '集市' : '我的挂单'}
          </button>
        ))}
      </div>

      {/* 分类 + 搜索（集市 tab） */}
      {tab === 'market' && (
        <>
          <div style={{ padding: '8px 14px 0', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                className={`${page.categoryBtn} ${category === c.key ? page.categoryActive : ''}`}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ padding: '6px 14px 8px' }}>
            <input
              style={{
                width: '100%', padding: '7px 10px', background: 'var(--paper-dark)',
                border: '1px solid var(--paper-darker)', borderRadius: 6,
                fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)', outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="搜索物品名称..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
          </div>
        </>
      )}

      <div className={page.scrollArea}>
        {tab === 'mine' && (
          <button
            style={{
              width: '100%', padding: 10, background: 'rgba(201,168,76,0.08)',
              border: '1px dashed rgba(201,168,76,0.3)', borderRadius: 8,
              fontSize: 13, color: 'var(--gold-dim)', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', marginBottom: 12, textAlign: 'center',
            }}
            onClick={() => setShowSell(true)}
          >
            + 挂单出售物品
          </button>
        )}

        {loading ? (
          <div className={page.empty}><p>加载中...</p></div>
        ) : items.length === 0 ? (
          <div className={page.empty}>
            <span className={page.placeholderIcon}>🏪</span>
            <p>{tab === 'mine' ? '暂无挂单' : '集市暂无商品'}</p>
            {tab === 'market' && <span className={page.hint}>去背包选择物品挂单，赚取差价</span>}
          </div>
        ) : (
          items.map(item => {
            const qColor = QUALITY_COLOR[item.itemQuality] || '#ccc';
            const isActing = acting === item.listingId;
            const remaining = item.quantity - item.sold;
            return (
              <div
                key={item.listingId}
                style={{
                  background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)',
                  borderRadius: 10, padding: '12px', marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontFamily: 'var(--font-main)', color: qColor }}>
                    {item.itemName}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink)', opacity: 0.45, fontFamily: 'var(--font-ui)' }}>
                    {item.sellerName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 16, color: 'var(--gold)', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
                      🪙 {item.unitPrice.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink)', opacity: 0.4, fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                      剩余 {remaining} 件
                    </div>
                  </div>
                  {tab === 'market' ? (
                    <button
                      disabled={isActing}
                      onClick={() => handleBuy(item)}
                      style={{
                        padding: '8px 18px', background: 'rgba(201,168,76,0.15)',
                        border: '1px solid rgba(201,168,76,0.35)', borderRadius: 6,
                        fontSize: 13, color: 'var(--gold-dim)', cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', fontWeight: 600,
                      }}
                    >
                      {isActing ? '...' : '购买'}
                    </button>
                  ) : (
                    <button
                      disabled={isActing}
                      onClick={() => handleCancel(item.listingId)}
                      style={{
                        padding: '8px 18px', background: 'rgba(200,80,80,0.1)',
                        border: '1px solid rgba(200,80,80,0.3)', borderRadius: 6,
                        fontSize: 13, color: '#e08080', cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {isActing ? '...' : '撤回'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 挂单弹窗 */}
      {showSell && (
        <div
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'flex-end', zIndex: 50,
          }}
          onClick={() => setShowSell(false)}
        >
          <div
            style={{
              width: '100%', background: 'var(--paper-dark)',
              borderTop: '1px solid rgba(201,168,76,0.2)',
              borderRadius: '12px 12px 0 0', padding: 20,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-main)', fontSize: 16, color: 'var(--gold)', marginBottom: 14 }}>
              挂单出售
            </h3>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--ink)', opacity: 0.5, fontFamily: 'var(--font-ui)', marginBottom: 4 }}>
                单价（金币）
              </div>
              <input
                style={{
                  width: '100%', padding: '8px 10px', background: 'var(--paper)',
                  border: '1px solid var(--paper-darker)', borderRadius: 6,
                  fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--font-ui)', outline: 'none',
                  boxSizing: 'border-box',
                }}
                type="number"
                placeholder="输入价格"
                value={sellPrice}
                onChange={e => setSellPrice(e.target.value)}
              />
            </div>
            <button
              style={{
                width: '100%', padding: 12, background: 'rgba(201,168,76,0.2)',
                border: '1px solid var(--gold)', borderRadius: 8,
                fontSize: 15, color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-main)',
              }}
              onClick={handleSell}
            >
              确认挂单
            </button>
            <button
              style={{
                width: '100%', padding: 10, background: 'none', border: 'none',
                fontSize: 13, color: 'var(--ink)', opacity: 0.4, cursor: 'pointer', marginTop: 4,
              }}
              onClick={() => setShowSell(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
