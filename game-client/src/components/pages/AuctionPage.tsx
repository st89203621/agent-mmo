import { useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchAuctionList, placeBid, buyNow, listItemOnAuction, cancelAuctionListing,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import type { AuctionItem } from '../../types';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

type Tab = 'active' | 'mybids' | 'mysales' | 'ended';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: '竞拍中' },
  { key: 'mybids', label: '我的竞拍' },
  { key: 'mysales', label: '我的出售' },
  { key: 'ended', label: '已结束' },
];

const QUALITY_CLASS: Record<string, string> = {
  white: '',
  green: styles.aucIconG,
  blue: styles.aucIconB,
  purple: styles.aucIconP,
  orange: styles.aucIconO,
};

function formatTime(endMs: number): { label: string; safe: boolean } {
  const diff = endMs - Date.now();
  if (diff <= 0) return { label: '已结束', safe: false };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return { label: `${h}时${m}分`, safe: h >= 1 };
  return { label: `${m}分钟`, safe: m >= 10 };
}

function qualityText(q: string) {
  if (q === 'orange') return '橙';
  if (q === 'purple') return '紫';
  if (q === 'blue') return '蓝';
  if (q === 'green') return '绿';
  return '白';
}

interface BidTarget { item: AuctionItem; minBid: number }

export default function AuctionPage() {
  usePageBackground(PAGE_BG.AUCTION);
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
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleBid = useCallback(async () => {
    if (!bidTarget) return;
    const amount = parseInt(bidInput, 10);
    if (isNaN(amount) || amount < bidTarget.minBid) {
      toast.error(`出价不能低于 ${bidTarget.minBid}`);
      return;
    }
    setActing(bidTarget.item.auctionId);
    try {
      const res = await placeBid(bidTarget.item.auctionId, amount);
      toast.success(`出价成功，当前最高 ${res.currentBid}`);
      setBidTarget(null);
      setBidInput('');
      await loadItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '出价失败');
    }
    setActing(null);
  }, [bidInput, bidTarget, loadItems]);

  const handleBuyNow = useCallback(async (item: AuctionItem) => {
    if (!item.buyNowPrice) return;
    setActing(item.auctionId);
    try {
      await buyNow(item.auctionId);
      toast.reward(`已购得 ${item.itemName}`);
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
    if (isNaN(start) || start <= 0) {
      toast.error('请输入有效起拍价');
      return;
    }
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
  }, [listBuyNow, listDuration, listStartPrice, loadItems]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>拍 卖 行</span>
            <span className={styles.appbarZone}>全服流通 · 高价者得</span>
          </div>
        </div>
      </div>

      <div className={styles.aucTabs}>
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`${styles.aucTab} ${tab === item.key ? styles.aucTabOn : ''}`.trim()}
            onClick={() => setTab(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.aucTopbar}>
        <div className={styles.aucBalance}>金 {gold.toLocaleString()} <span className={styles.aucSep}>|</span> 谨慎出价</div>
        {(tab === 'active' || tab === 'mysales') && (
          <button className={styles.aucUpBtn} onClick={() => setShowList(true)} type="button">
            上 架
          </button>
        )}
      </div>

      <div className={styles.aucList}>
        {loading ? (
          <div className={styles.feedEmpty}>拍卖数据加载中...</div>
        ) : items.length === 0 ? (
          <div className={styles.feedEmpty}>当前没有符合条件的拍品</div>
        ) : items.map((item) => {
          const time = formatTime(item.endTime);
          const actingNow = acting === item.auctionId;
          return (
            <div key={item.auctionId} className={styles.aucCard}>
              <div className={`${styles.aucIcon} ${QUALITY_CLASS[item.itemQuality] || ''}`.trim()}>
                {item.itemName.slice(0, 1)}
              </div>
              <div className={styles.aucMid}>
                <div className={styles.aucName}>
                  {item.itemName}
                  <span className={`${styles.aucQt} ${QUALITY_CLASS[item.itemQuality] || ''}`.trim()}>{qualityText(item.itemQuality)}</span>
                </div>
                <div className={styles.aucMeta}>{item.sellerName} · {item.bidCount} 次出价</div>
                <div className={styles.aucPriceRow}>
                  <span className={styles.aucCurrent}>现价 {item.currentBid.toLocaleString()}</span>
                  <span className={styles.aucBuyout}>一口 {item.buyNowPrice?.toLocaleString() || '--'}</span>
                </div>
              </div>
              <div className={styles.aucRight}>
                <div className={`${styles.aucCountdown} ${time.safe ? styles.aucCountdownSafe : ''}`.trim()}>{time.label}</div>
                {tab === 'active' && (
                  <button
                    className={styles.aucAction}
                    disabled={actingNow}
                    onClick={() => {
                      setBidTarget({
                        item,
                        minBid: item.currentBid + Math.max(1, Math.floor(item.currentBid * 0.05)),
                      });
                      setBidInput('');
                    }}
                    type="button"
                  >
                    {actingNow ? '...' : '竞拍'}
                  </button>
                )}
                {tab === 'mybids' && item.buyNowPrice && (
                  <button className={styles.aucAction} disabled={actingNow} onClick={() => handleBuyNow(item)} type="button">
                    {actingNow ? '...' : '一口'}
                  </button>
                )}
                {tab === 'mysales' && (
                  <button className={styles.aucAction} disabled={actingNow} onClick={() => handleCancel(item.auctionId)} type="button">
                    {actingNow ? '...' : '撤回'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {bidTarget && (
        <div className={styles.overlayMask} onClick={() => setBidTarget(null)}>
          <div className={styles.overlayPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.overlayTitle}>出 价 竞 拍</div>
            <div className={styles.overlayText}>{bidTarget.item.itemName} · 最低 {bidTarget.minBid}</div>
            <input className={styles.overlayInput} type="number" value={bidInput} onChange={(e) => setBidInput(e.target.value)} placeholder={`>= ${bidTarget.minBid}`} />
            <button className={styles.overlayPrimary} onClick={handleBid} type="button">确 认 出 价</button>
            {bidTarget.item.buyNowPrice && (
              <button className={styles.overlaySecondary} onClick={() => handleBuyNow(bidTarget.item)} type="button">一 口 购 买</button>
            )}
          </div>
        </div>
      )}

      {showList && (
        <div className={styles.overlayMask} onClick={() => setShowList(false)}>
          <div className={styles.overlayPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.overlayTitle}>上 架 拍 卖</div>
            <input className={styles.overlayInput} type="number" value={listStartPrice} onChange={(e) => setListStartPrice(e.target.value)} placeholder="起拍价" />
            <input className={styles.overlayInput} type="number" value={listBuyNow} onChange={(e) => setListBuyNow(e.target.value)} placeholder="一口价(可选)" />
            <div className={styles.durationRow}>
              {[1, 6, 24].map((hours) => (
                <button
                  key={hours}
                  className={`${styles.durationBtn} ${listDuration === hours ? styles.durationBtnOn : ''}`.trim()}
                  onClick={() => setListDuration(hours)}
                  type="button"
                >
                  {hours}小时
                </button>
              ))}
            </div>
            <button className={styles.overlayPrimary} onClick={handleListItem} type="button">确 认 上 架</button>
          </div>
        </div>
      )}
    </div>
  );
}
