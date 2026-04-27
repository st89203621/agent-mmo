import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchMyTitles,
  fetchAvailableTitles,
  equipTitle,
  unequipTitle,
  grantTitle,
  type TitleData,
} from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

type Tab = 'owned' | 'available';

interface TypeMeta {
  name: string;
  color: string;
  desc: string;
}

const TYPE_META: Record<string, TypeMeta> = {
  PRESTIGE: { name: '声望', color: 'var(--accent-gold)', desc: '攻 · 内' },
  POWER:    { name: '威望', color: '#5ca0d3',            desc: '血 · 防' },
  HONOR:    { name: '荣誉', color: '#d35c8a',            desc: '附攻 · 附防 · 敏' },
};

function renderBonus(t: TitleData) {
  const b = t.bonus;
  const parts: string[] = [];
  if (b.atk) parts.push(`攻+${b.atk}`);
  if (b.def) parts.push(`防+${b.def}`);
  if (b.hp) parts.push(`血+${b.hp}`);
  if (b.magicAtk) parts.push(`魔攻+${b.magicAtk}`);
  if (b.extraAtk) parts.push(`附攻+${b.extraAtk}`);
  if (b.extraDef) parts.push(`附防+${b.extraDef}`);
  if (b.agility) parts.push(`敏+${b.agility}`);
  return parts.join(' · ');
}

export default function TitlePage() {
  usePageBackground(PAGE_BG.TITLE);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [tab, setTab] = useState<Tab>('owned');
  const [owned, setOwned] = useState<TitleData[]>([]);
  const [available, setAvailable] = useState<TitleData[]>([]);
  const [equippedId, setEquippedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [my, all] = await Promise.all([fetchMyTitles(), fetchAvailableTitles()]);
      setOwned(my.titles || []);
      setEquippedId(my.equippedId || '');
      setAvailable(all.titles || []);
    } catch {
      setOwned([]);
      setAvailable([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEquip = useCallback(async (titleId: string) => {
    setBusy(titleId);
    try {
      await equipTitle(titleId);
      toast.success('称号已装备');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '装备失败');
    }
    setBusy(null);
  }, [load]);

  const handleUnequip = useCallback(async () => {
    setBusy('unequip');
    try {
      await unequipTitle();
      toast.info('称号已卸下');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '卸下失败');
    }
    setBusy(null);
  }, [load]);

  const handleGrant = useCallback(async (titleId: string) => {
    setBusy(titleId);
    try {
      await grantTitle(titleId);
      toast.reward('获得称号');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '获取失败');
    }
    setBusy(null);
  }, [load]);

  const ownedIds = useMemo(() => new Set(owned.map((t) => t.titleId)), [owned]);
  const listToShow = tab === 'owned' ? owned : available;

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>称 号</span>
            <span className={styles.appbarZone}>声望 · 威望 · 荣誉</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('codex')} type="button" aria-label="图鉴">鉴</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('status')} type="button" aria-label="返回">返</button>
          </div>
        </div>
      </div>

      <div className={styles.ttlTabs}>
        <button
          className={`${styles.ttlTab} ${tab === 'owned' ? styles.ttlTabOn : ''}`.trim()}
          onClick={() => setTab('owned')}
          type="button"
        >
          已拥有 · {owned.length}
        </button>
        <button
          className={`${styles.ttlTab} ${tab === 'available' ? styles.ttlTabOn : ''}`.trim()}
          onClick={() => setTab('available')}
          type="button"
        >
          全 部 称 号
        </button>
      </div>

      <div className={styles.scrollPlain}>
        {loading ? (
          <div className={styles.feedEmpty}>称号信息载入中...</div>
        ) : listToShow.length === 0 ? (
          <div className={styles.feedEmpty}>
            {tab === 'owned' ? '暂未获得称号 · 挑战副本 / 活动可获取' : '暂无可查看的称号'}
          </div>
        ) : (
          listToShow.map((t) => {
            const meta = TYPE_META[t.titleType] || TYPE_META.PRESTIGE;
            const equipped = t.titleId === equippedId;
            const hasIt = ownedIds.has(t.titleId);
            const cardStyle = { borderLeftColor: meta.color };
            return (
              <div
                key={t.titleId}
                className={`${styles.ttlCard} ${equipped ? styles.ttlCardEquipped : ''}`.trim()}
                style={cardStyle}
              >
                <div className={styles.ttlCardRow}>
                  <div style={{ minWidth: 0 }}>
                    <span className={styles.ttlName} style={{ color: meta.color }}>
                      {t.name}
                    </span>
                    <span className={styles.ttlType} style={{ color: meta.color }}>
                      {meta.name} · Lv{t.requiredLevel}
                    </span>
                    {equipped && <span className={styles.ttlMark}>· 装备中</span>}
                    <div className={styles.ttlDesc}>{t.description}</div>
                    <div className={styles.ttlBonus} style={{ color: meta.color }}>
                      {renderBonus(t) || meta.desc}
                    </div>
                  </div>
                  <div>
                    {tab === 'owned' && !equipped && (
                      <button
                        className={styles.ttlBtn}
                        onClick={() => handleEquip(t.titleId)}
                        disabled={busy === t.titleId}
                        type="button"
                      >
                        {busy === t.titleId ? '...' : '装 备'}
                      </button>
                    )}
                    {tab === 'owned' && equipped && (
                      <button
                        className={`${styles.ttlBtn} ${styles.ttlBtnGhost}`}
                        onClick={handleUnequip}
                        disabled={busy === 'unequip'}
                        type="button"
                      >
                        {busy === 'unequip' ? '...' : '卸 下'}
                      </button>
                    )}
                    {tab === 'available' && !hasIt && (
                      <button
                        className={styles.ttlBtn}
                        onClick={() => handleGrant(t.titleId)}
                        disabled={busy === t.titleId}
                        type="button"
                      >
                        {busy === t.titleId ? '...' : '获 取'}
                      </button>
                    )}
                    {tab === 'available' && hasIt && (
                      <span className={styles.ttlOwnedTag}>已拥有</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
