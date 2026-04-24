import { useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchAuctionList, placeBid, buyNow, listItemOnAuction, cancelAuctionListing,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import type { AuctionItem } from '../../types';
import page from '../../styles/page.module.css';
import own from './AuctionPage.module.css';

type Tab = 'active' | 'mybids' | 'mysales' | 'ended';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active',  label: '出售中' },
  { key: 'mybids',  label: '我的竞拍' },
  { key: 'mysales', label: '我的出售' },
  { key: 'ended',   label: '已结束' },
];

const QUALITY_CLASS: Record<string, keyof typeof own> = {
  white:  'qWhite',
  green:  'qGreen',
  blue:   'qBlue',
  purple: 'qPurple',
  orange: 'qOrange',
};

function formatTime(endMs: number): { label: string; expiring: boolean } {
  const diff = endMs - Date.now();
  if (diff <= 0) return { label: '已结束', expiring: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return { label: `${h}时${m}分后结束`, expiring: h < 1 };
  return { label: `${m}分钟后结束`, expiring: m < 10 };
}

function formatGold(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toLocaleString();
}

interface BidTarget { item: AuctionItem; minBid: number }

export default function AuctionPage() {
  const { gold } = usePlayerStore();
  const [tab, setTab] = useState<Tab>('active');
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [bidTarget, setBidTarget] = useState<BidTarget | null>(null);
  const [bidInput, setBidInput] = useState('');
  const [showList, setShowList] = useState(false);
  const [listStartPrice, setListStartPrice] = useState('');
  const [listBuyNow, setListBuyNow] = useState('');
  const [listDuration, setListDuration] = useState(24);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuctionList(tab);
      setItems(res.items || []);
    } catch { setItems([]); }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleBid = useCallback(async () => {
    if (!bidTarget) return;
    const amount = parseInt(bidInput, 10);
    if (isNaN(amount) || amount < bidTarget.minBid) {
      toast.error(`出价不能低于 ${formatGold(bidTarget.minBid)} 金币`);
      return;
    }
    setActing(bidTarget.item.auctionId);
    try {
      const res = await placeBid(bidTarget.item.auctionId, amount);
      toast.success(`出价成功！当前最高 ${formatGold(res.currentBid)}`);
      setBidTarget(null);
      setBidInput('');
      await loadItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '出价失败');
    }
    setActing(null);
  }, [bidTarget, bidInput, loadItems]);

  const handleBuyNow = useCallback(async (item: AuctionItem) => {
    if (!item.buyNowPrice) return;
    setActing(item.auctionId);
    try {
      await buyNow(item.auctionId);
      toast.reward(`购买成功！获得 ${item.itemName}`);
      await loadItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '购买失败');
    }
    setActing(null);
  }, [loadItems]);

  const handleCancel = useCallback(async (auctionId: string) => {
    setActing(auctionId);
    try {
      await cancelAuctionListing(auctionId);
      toast.success('已撤回拍卖');
      await loadItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '撤回失败');
    }
    setActing(null);
  }, [loadItems]);

  const handleListItem = useCallback(async () => {
    const start = parseInt(listStartPrice, 10);
    if (isNaN(start) || start <= 0) { toast.error('请输入有效起拍价'); return; }
    const buyNowVal = listBuyNow ? parseInt(listBuyNow, 10) : undefined;
    try {
      await listItemOnAuction({
        itemId: 'selected',
        startPrice: start,
        buyNowPrice: buyNowVal,
        durationHours: listDuration,
      });
      toast.success('上架成功');
      setShowList(false);
      setListStartPrice('');
      setListBuyNow('');
      await loadItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '上架失败');
    }
  }, [listStartPrice, listBuyNow, listDuration, loadItems]);

  const subtitle = `🪙 ${gold.toLocaleString()} · 出价需谨慎，成交不退款`;

  return (
    <div className={page.page}>
      <div className={page.header}>
        <p className={page.subtitle}>{subtitle}</p>
      </div>

      <div className={page.tabRow}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${page.tab} ${tab === t.key ? page.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={page.scrollArea}>
        {tab === 'active' && (
          <button className={page.dashedBtn} onClick={() => setShowList(true)}>
            + 上架我的物品
          </button>
        )}

        {loading ? (
          <div className={page.empty}><p>加载中…</p></div>
        ) : items.length === 0 ? (
          <div className={page.empty}>
            <span className={page.placeholderIcon}>🏛️</span>
            <p>暂无拍卖</p>
          </div>
        ) : items.map(item => {
          const qClass = own[QUALITY_CLASS[item.itemQuality] || 'qWhite'];
          const { label: timeLabel, expiring } = formatTime(item.endTime);
          const isActing = acting === item.auctionId;
          return (
            <div key={item.auctionId} className={page.card}>
              <div className={page.cardHeader}>
                <span className={`${page.cardTitle} ${qClass}`}>{item.itemName}</span>
                <span className={page.cardMeta}>{item.sellerName}</span>
              </div>

              <div className={page.cardRow}>
                <div className={page.priceBlock}>
                  <span className={page.priceLabel}>当前价</span>
                  <span className={page.priceValue}>🪙 {formatGold(item.currentBid)}</span>
                </div>
                {item.buyNowPrice ? (
                  <div className={page.priceBlock} style={{ alignItems: 'flex-end' }}>
                    <span className={page.priceLabel}>一口价</span>
                    <span className={own.buyNowValue}>🪙 {formatGold(item.buyNowPrice)}</span>
                  </div>
                ) : null}
              </div>

              <div className={page.cardFoot}>
                <span className={expiring ? own.timerExpiring : ''}>{timeLabel}</span>
                <span>{item.bidCount} 次出价</span>
              </div>

              {tab === 'active' && (
                <div className={own.bidRow}>
                  <button
                    className={own.bidBtn}
                    disabled={isActing}
                    onClick={() => {
                      setBidTarget({
                        item,
                        minBid: item.currentBid + Math.max(1, Math.floor(item.currentBid * 0.05)),
                      });
                      setBidInput('');
                    }}
                  >
                    {isActing ? '…' : '竞拍'}
                  </button>
                  {item.buyNowPrice ? (
                    <button
                      className={own.buyNowBtn}
                      disabled={isActing}
                      onClick={() => handleBuyNow(item)}
                    >
                      {isActing ? '…' : '一口价'}
                    </button>
                  ) : null}
                </div>
              )}

              {tab === 'mysales' && (
                <div className={page.actionRow}>
                  <button
                    className={page.dangerBtn}
                    disabled={isActing}
                    onClick={() => handleCancel(item.auctionId)}
                  >
                    {isActing ? '…' : '撤回'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 竞价抽屉 */}
      {bidTarget && (
        <div className={page.drawerOverlay} onClick={() => setBidTarget(null)}>
          <div className={page.drawer} onClick={e => e.stopPropagation()}>
            <div className={page.drawerTitle}>出价竞拍</div>
            <div className={page.drawerHint}>
              {bidTarget.item.itemName} · 最低 {formatGold(bidTarget.minBid)} 金币
            </div>
            <div className={page.field}>
              <label className={page.fieldLabel}>出价（金币）</label>
              <input
                className={page.input}
                type="number"
                placeholder={`≥ ${bidTarget.minBid}`}
                value={bidInput}
                onChange={e => setBidInput(e.target.value)}
              />
            </div>
            <button className={page.drawerSubmit} onClick={handleBid}>确认出价</button>
            <button className={page.drawerCancel} onClick={() => setBidTarget(null)}>取消</button>
          </div>
        </div>
      )}

      {/* 上架抽屉 */}
      {showList && (
        <div className={page.drawerOverlay} onClick={() => setShowList(false)}>
          <div className={page.drawer} onClick={e => e.stopPropagation()}>
            <div className={page.drawerTitle}>上架拍卖</div>
            <div className={page.drawerHint}>设置起拍价与时长，到期自动结算</div>

            <div className={page.field}>
              <label className={page.fieldLabel}>起拍价（金币）</label>
              <input
                className={page.input}
                type="number"
                placeholder="例：100"
                value={listStartPrice}
                onChange={e => setListStartPrice(e.target.value)}
              />
            </div>

            <div className={page.field}>
              <label className={page.fieldLabel}>一口价（可选）</label>
              <input
                className={page.input}
                type="number"
                placeholder="留空则无一口价"
                value={listBuyNow}
                onChange={e => setListBuyNow(e.target.value)}
              />
            </div>

            <div className={page.field}>
              <label className={page.fieldLabel}>拍卖时长</label>
              <div className={own.durationRow}>
                {[1, 6, 24].map(h => (
                  <button
                    key={h}
                    className={`${own.durationBtn} ${listDuration === h ? own.durationBtnActive : ''}`}
                    onClick={() => setListDuration(h)}
                  >
                    {h}小时
                  </button>
                ))}
              </div>
            </div>

            <button className={page.drawerSubmit} onClick={handleListItem}>上架</button>
            <button className={page.drawerCancel} onClick={() => setShowList(false)}>取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
