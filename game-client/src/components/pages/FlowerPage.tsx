import { useState, useEffect } from 'react';
import { fetchFlower, waterFlower, fetchGlobalFate, type FlowerData, type GlobalFateData } from '../../services/api';
import { useGameStore } from '../../store/gameStore';

const STAGE_ICONS: Record<string, string> = {
  '种子': '🌰', '萌芽': '🌱', '含苞': '🌿', '初绽': '🌸', '盛放': '🌺', '永恒': '💮',
};

const COLOR_MAP: Record<string, string> = {
  '白': '#e8e8e8', '青': '#7ecfcf', '紫': '#b07ec7', '金': '#e8c44a', '彩': 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #9b59b6)',
};

export default function FlowerPage() {
  const [flower, setFlower] = useState<FlowerData | null>(null);
  const [globalFate, setGlobalFate] = useState<GlobalFateData | null>(null);
  const [watering, setWatering] = useState(false);
  const [fateInput, setFateInput] = useState(10);
  const [trustInput, setTrustInput] = useState(10);
  const navigateTo = useGameStore(s => s.navigateTo);

  useEffect(() => {
    Promise.all([
      fetchFlower().catch(() => null),
      fetchGlobalFate().catch(() => null),
    ]).then(([f, gf]) => {
      if (f) setFlower(f);
      if (gf) setGlobalFate(gf);
    });
  }, []);

  const handleWater = async () => {
    if (!globalFate || globalFate.currentFate < fateInput) return;
    setWatering(true);
    try {
      const updated = await waterFlower(fateInput, trustInput);
      setFlower(updated);
      const gf = await fetchGlobalFate();
      setGlobalFate(gf);
    } finally {
      setWatering(false);
    }
  };

  if (!flower) return <div style={{ padding: 24, color: '#aaa' }}>加载中...</div>;

  const colorStyle = flower.color === '彩'
    ? { background: COLOR_MAP['彩'], WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties
    : { color: COLOR_MAP[flower.color] || '#e8e8e8' };

  return (
    <div style={{ padding: '16px 20px', minHeight: '100vh', background: '#0a0a12' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => navigateTo('character')} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>←</button>
        <h2 style={{ color: '#e8c44a', margin: 0, fontSize: 20 }}>情花</h2>
      </div>

      {/* 情花展示 */}
      <div style={{ textAlign: 'center', padding: '30px 0', background: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{STAGE_ICONS[flower.stage] || '🌰'}</div>
        <div style={{ fontSize: 22, fontWeight: 700, ...colorStyle, marginBottom: 8 }}>{flower.flowerName}</div>
        <div style={{ color: '#888', fontSize: 14 }}>
          阶段：{flower.stage} | 花色：{flower.color} | 经历 {flower.worldCount} 世
        </div>
        {flower.bloomed && flower.flowerVerse && (
          <div style={{ marginTop: 16, padding: '12px 20px', background: 'rgba(232,196,74,0.1)', borderRadius: 8, color: '#e8c44a', fontStyle: 'italic' }}>
            "{flower.flowerVerse}"
          </div>
        )}
      </div>

      {/* 浇灌数据 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#ff6b8a', fontSize: 24, fontWeight: 700 }}>{flower.totalFateWatered}</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>累计浇灌缘值</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#7ecfcf', fontSize: 24, fontWeight: 700 }}>{flower.totalTrustInfused}</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>累计注入信值</div>
        </div>
      </div>

      {/* 浇灌操作 */}
      {!flower.bloomed && globalFate && (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: '#ccc', margin: '0 0 16px', fontSize: 16 }}>浇灌情花</h3>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
            可用缘值：<span style={{ color: '#ff6b8a' }}>{globalFate.currentFate}</span> |
            可用信值：<span style={{ color: '#7ecfcf' }}>{globalFate.currentTrust}</span> |
            品级：<span style={{ color: '#e8c44a' }}>{globalFate.fateGrade}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <label style={{ color: '#aaa', fontSize: 13 }}>缘值</label>
            <input type="number" value={fateInput} onChange={e => setFateInput(+e.target.value)} min={0} max={globalFate.currentFate}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #333', background: '#111', color: '#fff' }} />
            <label style={{ color: '#aaa', fontSize: 13 }}>信值</label>
            <input type="number" value={trustInput} onChange={e => setTrustInput(+e.target.value)} min={0} max={globalFate.currentTrust}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #333', background: '#111', color: '#fff' }} />
          </div>
          <button onClick={handleWater} disabled={watering || fateInput <= 0}
            style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: watering ? '#444' : '#e8c44a', color: '#000', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            {watering ? '浇灌中...' : '浇灌情花'}
          </button>
        </div>
      )}

      {/* 阶段进度说明 */}
      <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
        <h4 style={{ color: '#888', margin: '0 0 12px', fontSize: 14 }}>成长之路</h4>
        {['种子|0', '萌芽|50', '含苞|150', '初绽|300', '盛放|500', '永恒|七世圆满'].map(item => {
          const [name, req] = item.split('|');
          const active = flower.stage === name;
          return (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', opacity: active ? 1 : 0.5 }}>
              <span style={{ fontSize: 16 }}>{STAGE_ICONS[name]}</span>
              <span style={{ color: active ? '#e8c44a' : '#666', fontWeight: active ? 700 : 400, fontSize: 13 }}>{name}</span>
              <span style={{ color: '#555', fontSize: 12, marginLeft: 'auto' }}>缘值 ≥ {req}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
