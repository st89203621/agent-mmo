import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { fetchEquipDetail, identifyEquip, allotEquipAttrs, deleteEquips, type EquipData } from '../../services/api';
import styles from './EquipDetailPage.module.css';

const POSITION_LABELS: Record<number, { label: string; icon: string }> = {
  1: { label: '武器', icon: '🗡️' },
  2: { label: '护甲', icon: '🛡️' },
  3: { label: '饰品', icon: '💍' },
  4: { label: '坐骑', icon: '🐴' },
  5: { label: '宠物蛋', icon: '🥚' },
};

const QUALITY_NAMES = ['普通', '精良', '稀有', '史诗', '传说', '神话'];
const QUALITY_COLORS = [
  'var(--quality-common)', 'var(--quality-uncommon)', 'var(--quality-rare)',
  'var(--quality-epic)', 'var(--quality-legendary)', 'var(--quality-mythic)',
];

const ELSE_PROP_LABELS: { key: string; label: string }[] = [
  { key: 'constitution', label: '体质' },
  { key: 'magicPower', label: '魔力' },
  { key: 'power', label: '力量' },
  { key: 'endurance', label: '耐力' },
  { key: 'agile', label: '敏捷' },
];

export default function EquipDetailPage() {
  const { pageParams, navigateTo } = useGameStore();
  const equipId = pageParams.equipId as string | undefined;

  const [equip, setEquip] = useState<EquipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [operating, setOperating] = useState(false);
  // 加点分配的增量
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
    const hasAllot = Object.values(deltas).some((v) => v > 0);
    if (!hasAllot) return;
    setOperating(true);
    try {
      const updated = await allotEquipAttrs(equip.id, deltas);
      setEquip(updated as EquipData);
      setDeltas({});
    } catch { /* noop */ }
    setOperating(false);
  }, [equip, deltas, remainPoints]);

  const handleIdentify = useCallback(async () => {
    if (!equip) return;
    setOperating(true);
    try {
      const updated = await identifyEquip(equip.id);
      setEquip(updated);
    } catch { /* noop */ }
    setOperating(false);
  }, [equip]);

  const handleDelete = useCallback(async () => {
    if (!equip) return;
    setOperating(true);
    try {
      await deleteEquips([equip.id]);
      navigateTo('character');
    } catch { /* noop */ }
    setOperating(false);
  }, [equip, navigateTo]);

  if (!equipId) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigateTo('character')}>←</button>
          <h2 className={styles.headerTitle}>装备详情</h2>
        </div>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🗡️</span>
          <p>选择一件装备查看详情</p>
        </div>
      </div>
    );
  }

  if (loading || !equip) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigateTo('character')}>←</button>
          <h2 className={styles.headerTitle}>装备详情</h2>
        </div>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  const meta = POSITION_LABELS[equip.position] || { label: '未知', icon: '❓' };
  const qualityColor = QUALITY_COLORS[equip.quality] || QUALITY_COLORS[0];
  const qualityName = QUALITY_NAMES[equip.quality] || '普通';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigateTo('character')}>←</button>
        <h2 className={styles.headerTitle}>装备详情</h2>
      </div>

      {/* 装备头部 */}
      <div className={styles.equipBanner}>
        <div className={styles.equipIconLarge} style={{ borderColor: qualityColor, background: `${qualityColor}15` }}>
          {meta.icon}
        </div>
        <div className={styles.equipMeta}>
          <div className={styles.equipNameRow}>
            <span className={styles.equipName} style={{ color: qualityColor }}>
              {equip.itemTypeId || meta.label}
            </span>
            <span className={styles.qualityBadge} style={{ background: qualityColor }}>
              {qualityName}
            </span>
          </div>
          <span className={styles.equipLevel}>Lv.{equip.level}</span>
          <span className={styles.equipPosition}>{meta.label} · 总属性 {equip.attrTotal}</span>
        </div>
      </div>

      <div className={styles.content}>
        {/* 固定属性 */}
        {equip.fixedProps && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>基础属性</h3>
            <div className={styles.propGrid}>
              <div className={styles.propItem}><span>生命</span><span className={styles.propVal}>{equip.fixedProps.hp}</span></div>
              <div className={styles.propItem}><span>法力</span><span className={styles.propVal}>{equip.fixedProps.mp}</span></div>
              <div className={styles.propItem}><span>物攻</span><span className={styles.propVal}>{equip.fixedProps.physicsAttack}</span></div>
              <div className={styles.propItem}><span>物防</span><span className={styles.propVal}>{equip.fixedProps.physicsDefense}</span></div>
              <div className={styles.propItem}><span>法攻</span><span className={styles.propVal}>{equip.fixedProps.magicAttack}</span></div>
              <div className={styles.propItem}><span>法防</span><span className={styles.propVal}>{equip.fixedProps.magicDefense}</span></div>
              <div className={styles.propItem}><span>速度</span><span className={styles.propVal}>{equip.fixedProps.speed}</span></div>
            </div>
          </section>
        )}

        {/* 加点属性 */}
        {equip.elseProps && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>分配属性</h3>
            {equip.undistributedAttr > 0 && (
              <div className={styles.remainBar}>
                <span>可分配点数</span>
                <span className={styles.remainVal}>{remainPoints}</span>
              </div>
            )}
            {ELSE_PROP_LABELS.map(({ key, label }) => {
              const base = (equip.elseProps as Record<string, number>)[key] || 0;
              const delta = deltas[key] || 0;
              return (
                <div key={key} className={styles.attrRow}>
                  <span className={styles.attrLabel}>{label}</span>
                  <div className={styles.attrControls}>
                    <button
                      className={styles.attrBtn}
                      disabled={delta <= 0 || operating}
                      onClick={() => handleDelta(key, -1)}
                    >−</button>
                    <span className={styles.attrVal}>{base + delta}</span>
                    <button
                      className={styles.attrBtn}
                      disabled={remainPoints <= 0 || operating}
                      onClick={() => handleDelta(key, 1)}
                    >+</button>
                    {delta > 0 && <span className={styles.attrDelta}>+{delta}</span>}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <p className={styles.identifyInfo}>已鉴定 {equip.identifyCount} 次</p>
      </div>

      {/* 底部操作 */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${styles.identifyBtn}`}
          onClick={handleIdentify}
          disabled={operating}
        >鉴定</button>
        {Object.values(deltas).some((v) => v > 0) && (
          <button
            className={`${styles.actionBtn} ${styles.confirmBtn}`}
            onClick={handleConfirmAllot}
            disabled={operating || remainPoints < 0}
          >确认分配</button>
        )}
        <button
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          onClick={handleDelete}
          disabled={operating}
        >销毁</button>
      </div>
    </div>
  );
}
