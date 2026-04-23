import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchAuctionList, placeBid, buyNow, listItemOnAuction, cancelAuctionListing,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import type { AuctionItem } from '../../types';
import page from '../../styles/page.module.css';
import own from './AuctionPage.module.css';

const styles = { ...page, ...own };

type Tab = 'active' | 'ended' | 'mybids' | 'mysales';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active',   label: '出售中' },
  { key: 'mybids',   label: '我的竞拍' },
  { key: 'mysales',  label: '我的出售' },
  { key: 'ended',    label: '已结束' },
];

const QUALITY_CLASS: Record<string, string> = {
  white: 'qualityWhite', green: 'qualityGreen', blue: 'qualityBlue',
  purple: 'qualityPurple', orange: 'qualityOrange',
};

function formatTime(ms: number): { label: string; expiring: boolean } {
  const diff = Math.max(0, ms - Date.now());
  if (diff === 0) return { label: '已结束', expiring: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return { label: `${h}小时${m}分后结束`, expiring: h < 1 };
  return { label: `${m}分钟后结束`, expiring: m < 10 };
}

function formatGold(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

interface BidTarget { item: AuctionItem; minBid: number; }

export default function AuctionPage() {
  const navigateTo = useGameStore(s => s.navigateTo);
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
      toast.success(`出价成功！当前最高价 ${formatGold(res.currentBid)}`);
      setBidTarget(null);
      setBidInput('');
      await loadItems();
    } catch (e: unknown) {
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
    } catch (e: unknown) {
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '撤回失败');
    }
    setActing(null);
  }, [loadItems]);

  const handleListItem = useCallback(async () => {
    const start = parseInt(listStartPrice, 10);
    const buyNowVal = listBuyNow ? parseInt(listBuyNow, 10) : undefined;
    if (isNaN(start) || start <= 0) {
      toast.error('请输入有效的起拍价');
      return;
    }
    try {
      await listItemOnAuction({ itemId: 'selected', startPrice: start, buyNowPrice: buyNowVal, durationHours: listDuration });
      toast.success('上架成功！');
      setShowList(false);
      setListStartPrice('');
      setListBuyNow('');
      await loadItems();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '上架失败');
    }
  }, [listStartPrice, listBuyNow, listDuration, loadItems]);

  return (
    <div className={styles.page} style={{ position: 'relative' }}>
      <div className={styles.header}>
        <button
          onClick={() => navigateTo('scene')}
          style={{ position: 'absolute', left: 16, top: 16, background: 'none', border: 'none', color: 'var(--ink)', opacity: 0.5, fontSize: 20, cursor: 'pointer' }}
        >←</button>
        <h2 className={styles.title}>拍卖行</h2>
        <p className={styles.subtitle}>🪙 {gold} · 出价需谨慎，成交不退款</p>
      </div>

      <div className={styles.tabRow}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.scrollArea}>
        {tab === 'active' && (
          <button className={styles.listBanner} onClick={() => setShowList(true)}>
            + 上架我的物品
          </button>
        )}

        {loading ? (
          <div className={styles.empty}>
            <p>加载中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>🏛️</span>
            <p>暂无拍卖</p>
          </div>
        ) : (
          items.map(item => {
            const qClass = own[QUALITY_CLASS[item.itemQuality] || 'qualityWhite'];
            const { label: timeLabel, expiring } = formatTime(item.endTime);
            const isActing = acting === item.auctionId;
            return (
              <div key={item.auctionId} className={own.card}>
                <div className={own.cardHeader}>
                  <div className={`${own.itemName} ${qClass}`}>{item.itemName}</div>
                  <div className={own.sellerMeta}>{item.sellerName}</div>
                </div>
                <div className={own.priceRow}>
                  <div className={own.priceBlock}>
                    <span className={own.priceLabel}>当前价</span>
                    <span className={own.priceValue}>🪙 {formatGold(item.currentBid)}</span>
                  </div>
                  {item.buyNowPrice && (
                    <div className={own.priceBlock}>
                      <span className={own.priceLabel}>一口价</span>
                      <span className={own.buyNowValue}>🪙 {formatGold(item.buyNowPrice)}</span>
                    </div>
                  )}
                </div>
                <div className={own.timerRow}>
                  <span className={expiring ? own.timerExpiring : ''}>{timeLabel}</span>
                  <span className={own.bidCount}>{item.bidCount} 次出价</span>
                </div>
                {tab === 'active' && (
                  <div className={own.actionRow}>
                    <button
                      className={own.bidBtn}
                      disabled={isActing}
                      onClick={() => {
                        setBidTarget({ item, minBid: item.currentBid + Math.max(1, Math.floor(item.currentBid * 0.05)) });
                        setBidInput('');
                      }}
                    >
                      {isActing ? '...' : '竞拍'}
                    </button>
                    {item.buyNowPrice && (
                      <button
                        className={own.buyNowBtn}
                        disabled={isActing}
                        onClick={() => handleBuyNow(item)}
                      >
                        {isActing ? '...' : '一口价'}
                      </button>
                    )}
                  </div>
                )}
                {tab === 'mysales' && (
                  <div className={own.actionRow}>
                    <button
                      className={own.bidBtn}
                      disabled={isActing}
                      onClick={() => handleCancel(item.auctionId)}
                    >
                      {isActing ? '...' : '撤回'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 竞价弹窗 */}
      {bidTarget && (
        <div className={own.bidOverlay} onClick={() => setBidTarget(null)}>
          <div className={own.bidDialog} onClick={e => e.stopPropagation()}>
            <div className={own.bidDialogTitle}>出价竞拍</div>
            <div className={own.bidDialogSub}>
              {bidTarget.item.itemName} · 最低出价 {formatGold(bidTarget.minBid)} 金币
            </div>
            <input
              className={own.formInput}
              type="number"
              placeholder={`最低 ${bidTarget.minBid}`}
              value={bidInput}
              onChange={e => setBidInput(e.target.value)}
            />
            <div className={own.bidDialogActions}>
              <button className={own.bidBtn} onClick={handleBid}>确认出价</button>
              <button className={own.cancelBtn} onClick={() => setBidTarget(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 上架面板 */}
      {showList && (
        <div className={own.bidOverlay} onClick={() => setShowList(false)}>
          <div className={own.listPanel} style={{ borderRadius: 12, marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className={own.listPanelTitle}>上架物品</div>
            <div className={own.formRow}>
              <label className={own.formLabel}>起拍价（金币）</label>
              <input
                className={own.formInput}
                type="number"
                placeholder="0"
                value={listStartPrice}
                onChange={e => setListStartPrice(e.target.value)}
              />
            </div>
            <div className={own.formRow}>
              <label className={own.formLabel}>一口价（可选）</label>
              <input
                className={own.formInput}
                type="number"
                placeholder="不填则无一口价"
                value={listBuyNow}
                onChange={e => setListBuyNow(e.target.value)}
              />
            </div>
            <div className={own.formRow}>
              <label className={own.formLabel}>拍卖时长</label>
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
            <button className={own.submitBtn} onClick={handleListItem}>上架拍卖</button>
            <button className={own.cancelBtn} onClick={() => setShowList(false)}>取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
