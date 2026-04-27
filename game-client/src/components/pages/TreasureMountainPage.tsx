import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchMountains,
  fetchMountainStatus,
  digMountain,
  type MountainData,
  type MountainStatusData,
  type DigResult,
} from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface Theme {
  color: string;
  icon: string;
  label: string;
}

const MT_THEME: Record<string, Theme> = {
  GOLD:     { color: 'var(--accent-gold)',   icon: '金', label: '金 山' },
  EXP:      { color: '#5ca0d3',              icon: '验', label: '经 验 山' },
  MATERIAL: { color: 'var(--accent-jade)',   icon: '材', label: '材 料 山' },
  ENCHANT:  { color: '#b07cd8',              icon: '魂', label: '附魂 山' },
  EQUIP:    { color: 'var(--accent-orange)', icon: '装', label: '装 备 山' },
  DIVINE:   { color: 'var(--accent-red)',    icon: '神', label: '神 物 山' },
};

const DEFAULT_THEME: Theme = { color: 'var(--accent-gold)', icon: '山', label: '宝 山' };

export default function TreasureMountainPage() {
  usePageBackground(PAGE_BG.TREASURE_MOUNTAIN);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [mountains, setMountains] = useState<MountainData[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, MountainStatusData>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [digging, setDigging] = useState(false);
  const [lastResult, setLastResult] = useState<DigResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMountains()
      .then((res) => {
        const list = res.mountains || [];
        setMountains(list);
        if (list.length > 0 && !selected) setSelected(list[0].mountainType);
      })
      .catch(() => toast.error('加载宝山失败'))
      .finally(() => setLoading(false));
  }, [selected]);

  const loadStatus = useCallback(async (mt: string) => {
    try {
      const status = await fetchMountainStatus(mt);
      setStatusMap((prev) => ({ ...prev, [mt]: status }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (selected) loadStatus(selected);
  }, [selected, loadStatus]);

  const handleSelect = useCallback((mt: string) => {
    setSelected(mt);
    setLastResult(null);
  }, []);

  const handleDig = useCallback(async () => {
    if (!selected || digging) return;
    setDigging(true);
    try {
      const result = await digMountain(selected);
      setLastResult(result);
      if (result.success) {
        toast.reward(result.message);
        await loadStatus(selected);
      } else {
        toast.warning(result.message);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '挖掘失败');
    }
    setDigging(false);
  }, [selected, digging, loadStatus]);

  const selMountain = useMemo(
    () => mountains.find((m) => m.mountainType === selected) ?? null,
    [mountains, selected],
  );
  const selStatus = selected ? statusMap[selected] : null;
  const selTheme = selected ? (MT_THEME[selected] || DEFAULT_THEME) : DEFAULT_THEME;

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>宝 山</span>
            <span className={styles.appbarZone}>盟会专属 · 每日挖掘</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('guild')} type="button" aria-label="盟会">盟</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('inventory')} type="button" aria-label="背包">包</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.tmHero}>
          <div className={styles.tmHeroTitle}>宝 山 探 秘</div>
          <div className={styles.tmHeroSub}>加入盟会后可挖掘宝山 · 每日奖励丰厚</div>
        </div>

        <div className={styles.sectRow}>
          山 脉 一 览
          <span className={styles.sectMore}>{mountains.length} 座</span>
        </div>

        {loading ? (
          <div className={styles.feedEmpty}>山脉信息载入中...</div>
        ) : mountains.length === 0 ? (
          <div className={styles.feedEmpty}>当前无可用宝山 · 请先加入盟会</div>
        ) : (
          <div className={styles.tmList}>
            {mountains.map((mt) => {
              const theme = MT_THEME[mt.mountainType] || DEFAULT_THEME;
              const active = mt.mountainType === selected;
              const status = statusMap[mt.mountainType];
              return (
                <button
                  key={mt.mountainType}
                  className={`${styles.tmItem} ${active ? styles.tmItemOn : ''}`.trim()}
                  onClick={() => handleSelect(mt.mountainType)}
                  type="button"
                >
                  <span className={styles.tmIc} style={{ color: theme.color }}>{theme.icon}</span>
                  <span className={styles.tmInfo}>
                    <span className={styles.tmNm} style={{ color: active ? theme.color : undefined }}>
                      {mt.name}
                    </span>
                    <span className={styles.tmMeta}>
                      盟 Lv{mt.requiredGuildLevel} · 每日 {mt.maxDigTimes} 次
                      {status ? ` · 已挖 ${status.digCount}` : ''}
                    </span>
                    <span className={styles.tmDesc}>{mt.description}</span>
                  </span>
                  <span className={styles.tmStat} style={{ color: theme.color }}>
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selMountain && (
          <div className={styles.tmPanel} style={{ borderColor: selTheme.color }}>
            <div className={styles.tmPanelTitle} style={{ color: selTheme.color }}>
              {selMountain.name}
            </div>
            {selStatus && (
              <div className={styles.tmPanelMeta}>
                今日进度 {selStatus.digCount} / {selMountain.maxDigTimes} · 累计奖励 {selStatus.totalReward}
              </div>
            )}
            <button
              className={styles.tmDigBtn}
              style={selTheme.color ? { background: selTheme.color } : undefined}
              disabled={digging}
              onClick={handleDig}
              type="button"
            >
              {digging ? '挖 掘 中 ...' : '✦ 开 始 挖 掘'}
            </button>
            {lastResult && lastResult.success && (
              <div className={styles.tmDigResult} style={{ color: selTheme.color, borderColor: selTheme.color }}>
                + {lastResult.reward} · {lastResult.rewardType} · {lastResult.digCount}/{lastResult.maxDigTimes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
