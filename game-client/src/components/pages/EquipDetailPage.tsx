import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  fetchEquipDetail,
  identifyEquip,
  allotEquipAttrs,
  deleteEquips,
  type EquipData,
} from '../../services/api';
import { QUALITY_NAMES, QUALITY_COLORS } from '../../constants/quality';
import { POSITION_LABELS } from '../../constants/equipment';
import styles from './lunhui/LunhuiPages.module.css';

const ELSE_PROP_LABELS: { key: string; label: string }[] = [
  { key: 'constitution', label: '体 质' },
  { key: 'magicPower', label: '魔 力' },
  { key: 'power', label: '力 量' },
  { key: 'endurance', label: '耐 力' },
  { key: 'agile', label: '敏 捷' },
];

function AppBarHead({ onBack }: { onBack: () => void }) {
  return (
    <div className={styles.appbar}>
      <div className={styles.appbarRow}>
        <div className={styles.appbarLoc}>
          <span className={styles.appbarBook}>装 备</span>
          <span className={styles.appbarZone}>观 器 · 鉴 物 · 分 点</span>
        </div>
        <div className={styles.appbarIcons}>
          <button
            type="button"
            className={styles.appbarIcon}
            onClick={onBack}
            aria-label="返回"
          >
            回
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EquipDetailPage() {
  const pageParams = useGameStore((s) => s.pageParams);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const equipId = pageParams.equipId as string | undefined;

  const [equip, setEquip] = useState<EquipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [operating, setOperating] = useState(false);
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!equipId) return;
    setLoading(true);
    fetchEquipDetail(equipId)
      .then(setEquip)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [equipId]);

  const remainPoints = equip
    ? equip.undistributedAttr - Object.values(deltas).reduce((s, v) => s + v, 0)
    : 0;

  const handleDelta = useCallback((key: string, diff: number) => {
    setDeltas((prev) => {
      const next = (prev[key] || 0) + diff;
      if (next < 0) return prev;
      return { ...prev, [key]: next };
    });
  }, []);

  const handleConfirmAllot = useCallback(async () => {
    if (!equip || remainPoints < 0) return;
    if (!Object.values(deltas).some((v) => v > 0)) return;
    setOperating(true);
    try {
      const updated = await allotEquipAttrs(equip.id, deltas);
      setEquip(updated as EquipData);
      setDeltas({});
    } catch {
      /* noop */
    }
    setOperating(false);
  }, [equip, deltas, remainPoints]);

  const handleIdentify = useCallback(async () => {
    if (!equip) return;
    setOperating(true);
    try {
      const updated = await identifyEquip(equip.id);
      setEquip(updated);
    } catch {
      /* noop */
    }
    setOperating(false);
  }, [equip]);

  const handleDelete = useCallback(async () => {
    if (!equip) return;
    setOperating(true);
    try {
      await deleteEquips([equip.id]);
      navigateTo('character');
    } catch {
      /* noop */
    }
    setOperating(false);
  }, [equip, navigateTo]);

  const goBack = useCallback(() => navigateTo('character'), [navigateTo]);

  if (!equipId) {
    return (
      <div className={styles.mockPage}>
        <AppBarHead onBack={goBack} />
        <div className={styles.eqEmpty}>
          <span className={styles.eqEmptyIcon}>器</span>
          <span>尚 未 选 定 装 备</span>
        </div>
      </div>
    );
  }

  if (loading || !equip) {
    return (
      <div className={styles.mockPage}>
        <AppBarHead onBack={goBack} />
        <div className={styles.rbLoading}>加 载 装 备 信 息 ...</div>
      </div>
    );
  }

  const meta = POSITION_LABELS[equip.position] || { label: '未知', icon: '器' };
  const qualityColor = QUALITY_COLORS[equip.quality] || QUALITY_COLORS[0];
  const qualityName = QUALITY_NAMES[equip.quality] || '普通';
  const hasAllot = Object.values(deltas).some((v) => v > 0);

  return (
    <div className={styles.mockPage}>
      <AppBarHead onBack={goBack} />

      <div className={styles.eqBanner}>
        <div
          className={styles.eqIcon}
          style={{ borderColor: qualityColor, background: `${qualityColor}14` }}
        >
          {equip.icon || meta.icon}
        </div>
        <div className={styles.eqMeta}>
          <div className={styles.eqNameRow}>
            <span className={styles.eqName} style={{ color: qualityColor }}>
              {equip.name || meta.label}
            </span>
            <span className={styles.eqBadge} style={{ background: qualityColor }}>
              {qualityName}
            </span>
          </div>
          <span className={styles.eqLv}>Lv.{equip.level}</span>
          <span className={styles.eqPos}>
            {meta.label} · 总属性 {equip.attrTotal}
          </span>
        </div>
      </div>

      <div className={styles.eqBody}>
        {equip.fixedProps && (
          <section className={styles.eqSect}>
            <div className={styles.eqSectH}>— 基 础 属 性 —</div>
            <div className={styles.eqPropGrid}>
              <div className={styles.eqProp}>
                <span>生 命</span>
                <span className={styles.eqPropV}>{equip.fixedProps.hp}</span>
              </div>
              <div className={styles.eqProp}>
                <span>法 力</span>
                <span className={styles.eqPropV}>{equip.fixedProps.mp}</span>
              </div>
              <div className={styles.eqProp}>
                <span>物 攻</span>
                <span className={styles.eqPropV}>{equip.fixedProps.physicsAttack}</span>
              </div>
              <div className={styles.eqProp}>
                <span>物 防</span>
                <span className={styles.eqPropV}>{equip.fixedProps.physicsDefense}</span>
              </div>
              <div className={styles.eqProp}>
                <span>法 攻</span>
                <span className={styles.eqPropV}>{equip.fixedProps.magicAttack}</span>
              </div>
              <div className={styles.eqProp}>
                <span>法 防</span>
                <span className={styles.eqPropV}>{equip.fixedProps.magicDefense}</span>
              </div>
              <div className={styles.eqProp}>
                <span>速 度</span>
                <span className={styles.eqPropV}>{equip.fixedProps.speed}</span>
              </div>
            </div>
          </section>
        )}

        {equip.elseProps && (
          <section className={styles.eqSect}>
            <div className={styles.eqSectH}>— 分 配 属 性 —</div>
            {equip.undistributedAttr > 0 && (
              <div className={styles.eqRemain}>
                <span>可 分 配 点 数</span>
                <span className={styles.eqRemainV}>{remainPoints}</span>
              </div>
            )}
            {ELSE_PROP_LABELS.map(({ key, label }) => {
              const base = (equip.elseProps as Record<string, number>)[key] || 0;
              const delta = deltas[key] || 0;
              return (
                <div key={key} className={styles.eqAttrRow}>
                  <span className={styles.eqAttrLabel}>{label}</span>
                  <div className={styles.eqAttrCtrls}>
                    <button
                      type="button"
                      className={styles.eqAttrBtn}
                      disabled={delta <= 0 || operating}
                      onClick={() => handleDelta(key, -1)}
                    >
                      −
                    </button>
                    <span className={styles.eqAttrVal}>{base + delta}</span>
                    <button
                      type="button"
                      className={styles.eqAttrBtn}
                      disabled={remainPoints <= 0 || operating}
                      onClick={() => handleDelta(key, 1)}
                    >
                      +
                    </button>
                    {delta > 0 && <span className={styles.eqAttrDelta}>+{delta}</span>}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <div className={styles.eqIdInfo}>已 鉴 定 {equip.identifyCount} 次</div>
      </div>

      <div className={styles.eqActs}>
        <button
          type="button"
          className={`${styles.eqActBtn} ${styles.eqActBtnGold}`}
          onClick={handleIdentify}
          disabled={operating}
        >
          鉴 定
        </button>
        <button
          type="button"
          className={styles.eqActBtn}
          onClick={() => navigateTo('enchant', { equipId: equip.id })}
        >
          附 魔
        </button>
        {hasAllot && (
          <button
            type="button"
            className={`${styles.eqActBtn} ${styles.eqActBtnPrim}`}
            onClick={handleConfirmAllot}
            disabled={operating || remainPoints < 0}
          >
            确 认
          </button>
        )}
        <button
          type="button"
          className={`${styles.eqActBtn} ${styles.eqActBtnRed}`}
          onClick={handleDelete}
          disabled={operating}
        >
          销 毁
        </button>
      </div>
    </div>
  );
}
