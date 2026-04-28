import { useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchAuctionList, placeBid, buyNow, listItemOnAuction, cancelAuctionListing,
  fetchBagItems, fetchPlayerCurrency,
} from '../../services/api';
import type { BagItemData } from '../../services/api';
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

const QUALITY_CELL_CLASS: Record<string, string> = {
  white: '',
  green: styles.aucBagCellG,
  blue: styles.aucBagCellB,
  purple: styles.aucBagCellP,
  orange: styles.aucBagCellO,
};

function formatTime(endMs: number, now: number): { label: string; safe: boolean } {
  const diff = endMs - now;
  if (diff <= 0) return { label: '已结束', safe: false };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return { label: `${h}时${m}分`, safe: h >= 1 };
  if (m > 0) return { label: `${m}分${s.toString().padStart(2, '0')}秒`, safe: m >= 10 };
  return { label: `${s}秒`, safe: false };
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
  const gold = usePlayerStore((s) => s.gold);
  const setCurrency = usePlayerStore((s) => s.setCurrency);
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
  const [bagItems, setBagItems] = useState<BagItemData[]>([]);
  const [bagLoading, setBagLoading] = useState(false);
  const [bagFallback, setBagFallback] = useState(false);
  const [selectedBagItem, setSelectedBagItem] = useState<BagItemData | null>(null);
  const [manualItemId, setManualItemId] = useState('');
  const [now, setNow] = useState(() => Date.now());

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

  const refreshCurrency = useCallback(async () => {
    try {
      const c = await fetchPlayerCurrency();
      setCurrency(c.gold, c.diamond);
    } catch { /* noop */ }
  }, [setCurrency]);

  const loadBag = useCallback(async () => {
    setBagLoading(true);
    try {
      const res = await fetchBagItems();
      setBagItems(res.items || []);
      setBagFallback(false);
    } catch {
      setBagItems([]);
      setBagFallback(true);
    }
    setBagLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (tab !== 'active') return undefined;
    const id = window.setInterval(() => {
      loadItems();
    }, 30000);
    return () => window.clearInterval(id);
  }, [tab, loadItems]);

  useEffect(() => {
    if (!showList) return;
    setSelectedBagItem(null);
    setManualItemId('');
    loadBag();
  }, [showList, loadBag]);

  useEffect(() => {
    if (tab !== 'active' || items.length === 0) return undefined;
    const expiresIn = items
      .map((it) => it.endTime - Date.now())
      .filter((d) => d > 0);
    if (expiresIn.length === 0) return undefined;
    const next = Math.min(...expiresIn) + 250;
    const id = window.setTimeout(() => loadItems(), next);
    return () => window.clearTimeout(id);
  }, [items, tab, loadItems]);

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
      await Promise.all([loadItems(), refreshCurrency()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '出价失败');
    }
    setActing(null);
  }, [bidInput, bidTarget, loadItems, refreshCurrency]);

  const handleBuyNow = useCallback(async (item: AuctionItem) => {
    if (!item.buyNowPrice) return;
    setActing(item.auctionId);
    try {
      await buyNow(item.auctionId);
      toast.reward(`已购得 ${item.itemName}`);
      await Promise.all([loadItems(), refreshCurrency()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '购买失败');
    }
    setActing(null);
  }, [loadItems, refreshCurrency]);

  const handleCancel = useCallback(async (auctionId: string) => {
    setActing(auctionId);
    try {
      await cancelAuctionListing(auctionId);
      toast.success('已撤回拍卖');
      await Promise.all([loadItems(), refreshCurrency()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '撤回失败');
    }
    setActing(null);
  }, [loadItems, refreshCurrency]);

  const handleListItem = useCallback(async () => {
    const start = parseInt(listStartPrice, 10);
    if (isNaN(start) || start <= 0) {
      toast.error('请输入有效起拍价');
      return;
    }
    const itemId = bagFallback ? manualItemId.trim() : selectedBagItem?.id;
    if (!itemId) {
      toast.error(bagFallback ? '请输入物品 ID' : '请选择上架物品');
      return;
    }
    const buyNowVal = listBuyNow ? parseInt(listBuyNow, 10) : undefined;
    try {
      await listItemOnAuction({
        itemId,
        startPrice: start,
        buyNowPrice: buyNowVal,
        durationHours: listDuration,
      });
      toast.success('上架成功');
      setShowList(false);
      setListStartPrice('');
      setListBuyNow('');
      setSelectedBagItem(null);
      setManualItemId('');
      await Promise.all([loadItems(), refreshCurrency()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '上架失败');
    }
  }, [bagFallback, listBuyNow, listDuration, listStartPrice, loadItems, manualItemId, refreshCurrency, selectedBagItem]);

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
          const time = formatTime(item.endTime, now);
          const actingNow = acting === item.auctionId;
          const outbid = tab === 'mybids' && typeof item.myBid === 'number' && item.myBid < item.currentBid;
          return (
            <div key={item.auctionId} className={styles.aucCard}>
              <div className={`${styles.aucIcon} ${QUALITY_CLASS[item.itemQuality] || ''}`.trim()}>
                {item.itemName.slice(0, 1)}
              </div>
              <div className={styles.aucMid}>
                <div className={styles.aucName}>
                  {item.itemName}
                  <span className={`${styles.aucQt} ${QUALITY_CLASS[item.itemQuality] || ''}`.trim()}>{qualityText(item.itemQuality)}</span>
                  {outbid && <span className={styles.aucOutbid}>已被超过</span>}
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

            <div className={styles.aucPickerToolbar}>
              <span>{bagFallback ? '背包不可用 · 手动输入' : '选 择 物 品'}</span>
              {!bagFallback && (
                <button className={styles.aucPickerRefresh} onClick={loadBag} type="button" disabled={bagLoading}>
                  {bagLoading ? '加载中' : '刷 新'}
                </button>
              )}
            </div>

            {bagFallback ? (
              <input
                className={styles.overlayInput}
                value={manualItemId}
                onChange={(e) => setManualItemId(e.target.value)}
                placeholder="物品 ID"
              />
            ) : bagLoading ? (
              <div className={styles.aucBagEmpty}>加载背包中...</div>
            ) : bagItems.length === 0 ? (
              <div className={styles.aucBagEmpty}>背包暂无可上架物品</div>
            ) : (
              <div className={styles.aucBagGrid}>
                {bagItems.map((bi) => {
                  const qClass = QUALITY_CELL_CLASS[bi.quality || 'white'] || '';
                  const on = selectedBagItem?.id === bi.id;
                  return (
                    <button
                      key={bi.id}
                      className={`${styles.aucBagCell} ${qClass} ${on ? styles.aucBagCellOn : ''}`.trim()}
                      onClick={() => setSelectedBagItem(bi)}
                      type="button"
                    >
                      <span className={styles.aucBagIcon}>{(bi.name || bi.itemTypeId).slice(0, 1)}</span>
                      <span className={styles.aucBagName}>{bi.name || bi.itemTypeId}</span>
                      <span className={styles.aucBagQty}>×{bi.quantity}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedBagItem && !bagFallback && (
              <div className={styles.aucBagSelected}>
                已选：{selectedBagItem.name || selectedBagItem.itemTypeId} ×{selectedBagItem.quantity}
              </div>
            )}

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
