import { useState, useEffect, useCallback } from 'react';
import {
  fetchMountains, fetchMountainStatus, digMountain,
  type MountainData, type MountainStatusData, type DigResult,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import styles from './PageSkeleton.module.css';

const MT_THEME: Record<string, { color: string; bg: string; icon: string }> = {
  GOLD:    { color: '#e8a642', bg: 'rgba(232,166,66,0.12)', icon: 'Au' },
  EXP:     { color: '#5ca0d3', bg: 'rgba(92,160,211,0.12)', icon: 'XP' },
  MATERIAL:{ color: '#6cc070', bg: 'rgba(108,192,112,0.12)', icon: 'Mt' },
  ENCHANT: { color: '#b07cd8', bg: 'rgba(176,124,216,0.12)', icon: 'En' },
  EQUIP:   { color: '#d3855c', bg: 'rgba(211,133,92,0.12)', icon: 'Eq' },
  DIVINE:  { color: '#e85c5c', bg: 'rgba(232,92,92,0.12)', icon: 'Di' },
};

export default function TreasureMountainPage() {
  const [mountains, setMountains] = useState<MountainData[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, MountainStatusData>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [digging, setDigging] = useState(false);
  const [lastResult, setLastResult] = useState<DigResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMountains()
      .then(res => setMountains(res.mountains || []))
      .catch(() => toast.error('加载宝山失败'))
      .finally(() => setLoading(false));
  }, []);

  const loadStatus = useCallback(async (mt: string) => {
    try {
      const status = await fetchMountainStatus(mt);
      setStatusMap(prev => ({ ...prev, [mt]: status }));
    } catch {}
  }, []);

  const handleSelect = useCallback((mt: string) => {
    setSelected(mt);
    setLastResult(null);
    loadStatus(mt);
  }, [loadStatus]);

  const handleDig = useCallback(async () => {
    if (!selected || digging) return;
    setDigging(true);
    try {
      const result = await digMountain(selected);
      setLastResult(result);
      if (result.success) {
        toast.success(result.message);
        loadStatus(selected);
      } else {
        toast.warning(result.message);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '挖掘失败');
    }
    setDigging(false);
  }, [selected, digging, loadStatus]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}><h2 className={styles.title}>宝山</h2></div>
        <div className={styles.empty}><p>加载中...</p></div>
      </div>
    );
  }

  const selMountain = mountains.find(m => m.mountainType === selected);
  const selStatus = selected ? statusMap[selected] : null;
  const selTheme = selected ? MT_THEME[selected] || MT_THEME.GOLD : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>宝山探宝</h2>
        <p className={styles.subtitle}>加入盟会后可挖掘宝山获取丰厚奖励</p>
      </div>

      <div className={styles.scrollArea}>
        {/* 宝山列表 */}
        <div className={styles.cardList}>
          {mountains.map(mt => {
            const theme = MT_THEME[mt.mountainType] || MT_THEME.GOLD;
            const active = mt.mountainType === selected;
            const status = statusMap[mt.mountainType];
            return (
              <div
                key={mt.mountainType}
                className={styles.card}
                style={{
                  borderColor: active ? theme.color : undefined,
                  background: active ? theme.bg : undefined,
                }}
                onClick={() => handleSelect(mt.mountainType)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: theme.bg, border: `1px solid ${theme.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: theme.color, flexShrink: 0,
                  }}>
                    {theme.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className={styles.cardTitle} style={active ? { color: theme.color } : undefined}>
                      {mt.name}
                    </p>
                    <p className={styles.cardMeta}>
                      盟会等级 Lv.{mt.requiredGuildLevel} | 每日{mt.maxDigTimes}次
                      {status ? ` | 已挖${status.digCount}次` : ''}
                    </p>
                    <p className={styles.cardDesc}>{mt.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {mountains.length === 0 && (
          <div className={styles.empty}>
            <p>暂无宝山数据</p>
          </div>
        )}

        {/* 挖掘面板 */}
        {selMountain && selTheme && (
          <div style={{
            marginTop: 16, padding: 16,
            background: selTheme.bg, border: `1px solid ${selTheme.color}`,
            borderRadius: 'var(--radius-md)',
          }}>
            <h3 style={{ fontSize: 15, margin: '0 0 8px', color: selTheme.color }}>
              {selMountain.name}
            </h3>

            {selStatus && (
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
                今日进度: {selStatus.digCount}/{selMountain.maxDigTimes} |
                累计奖励: {selStatus.totalReward}
              </div>
            )}

            <button
              className={styles.actionBtn}
              style={{
                background: selTheme.color, color: '#fff',
                width: '100%', marginTop: 0,
                opacity: digging ? 0.6 : 1,
              }}
              disabled={digging}
              onClick={handleDig}
            >
              {digging ? '挖掘中...' : '挖掘'}
            </button>

            {lastResult && lastResult.success && (
              <div style={{
                marginTop: 12, padding: 10,
                background: 'rgba(255,255,255,0.06)', borderRadius: 8,
                fontSize: 13, textAlign: 'center',
              }}>
                <span style={{ color: selTheme.color, fontWeight: 600 }}>
                  +{lastResult.reward} {lastResult.rewardType}
                </span>
                <span style={{ opacity: 0.5, marginLeft: 8 }}>
                  ({lastResult.digCount}/{lastResult.maxDigTimes})
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
