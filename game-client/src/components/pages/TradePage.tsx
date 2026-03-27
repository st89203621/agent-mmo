import { useState, useEffect } from 'react';
import { fetchOpenTrades, fetchMyTrades, acceptTrade, cancelTrade, type TradeData } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';

export default function TradePage() {
  const [tab, setTab] = useState<'market' | 'mine'>('market');
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigateTo = useGameStore(s => s.navigateTo);
  const playerId = usePlayerStore(s => s.playerId);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'market') {
        const data = await fetchOpenTrades();
        setTrades(data.trades || []);
      } else {
        const data = await fetchMyTrades();
        setTrades(data.trades || []);
      }
    } catch { setTrades([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const handleAccept = async (tradeId: string) => {
    await acceptTrade(tradeId);
    load();
  };

  const handleCancel = async (tradeId: string) => {
    await cancelTrade(tradeId);
    load();
  };

  return (
    <div style={{ padding: '16px 20px', minHeight: '100vh', background: '#0a0a12' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => navigateTo('home')} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>←</button>
        <h2 style={{ color: '#e8c44a', margin: 0, fontSize: 20 }}>自由交易</h2>
      </div>

      {/* 标签栏 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['market', 'mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: tab === t ? '1px solid #e8c44a' : '1px solid #333',
              background: tab === t ? 'rgba(232,196,74,0.15)' : 'rgba(255,255,255,0.05)', color: tab === t ? '#e8c44a' : '#888',
              cursor: 'pointer', fontWeight: 600 }}>
            {t === 'market' ? '集市' : '我的交易'}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>加载中...</div> : (
        trades.length === 0 ? <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>暂无交易</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trades.map(t => (
              <div key={t.tradeId} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#e0e0e0', fontWeight: 600, fontSize: 15 }}>{t.itemName || t.itemId}</div>
                    <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>x{t.quantity} | {t.currency === 'diamond' ? '💎' : '🪙'}{t.price}</div>
                    <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>卖家：{t.sellerName || `#${t.sellerId}`}</div>
                  </div>
                  <div>
                    {tab === 'market' && t.sellerId !== Number(playerId) && t.status === 'OPEN' && (
                      <button onClick={() => handleAccept(t.tradeId)}
                        style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4caf50', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                        购买
                      </button>
                    )}
                    {tab === 'mine' && t.sellerId === Number(playerId) && t.status === 'OPEN' && (
                      <button onClick={() => handleCancel(t.tradeId)}
                        style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#f44336', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                        取消
                      </button>
                    )}
                    {t.status !== 'OPEN' && (
                      <span style={{ color: t.status === 'SOLD' ? '#4caf50' : '#f44336', fontSize: 13 }}>
                        {t.status === 'SOLD' ? '已成交' : '已取消'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
