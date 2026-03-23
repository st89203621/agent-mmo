import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { fetchEquipList, fetchEnchantInfo, applyEnchant, type EquipData, type EnchantData } from '../../services/api';
import styles from './PageSkeleton.module.css';

const RUNE_LEVELS = [
  { level: 1, name: '小型符文', desc: '附魔+1~3级 · 成功率30%', cost: '100金币' },
  { level: 2, name: '中型符文', desc: '附魔+3~5级 · 成功率20%', cost: '200金币' },
  { level: 3, name: '大型符文', desc: '附魔+5~7级 · 成功率15%', cost: '300金币' },
  { level: 4, name: '超级符文', desc: '附魔+7~10级 · 成功率10%', cost: '500金币' },
];

export default function EnchantPage() {
  const { pageParams } = useGameStore();
  const [equips, setEquips] = useState<EquipData[]>([]);
  const [selectedEquip, setSelectedEquip] = useState<string | null>((pageParams?.equipId as string) || null);
  const [enchant, setEnchant] = useState<EnchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enchanting, setEnchanting] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  useEffect(() => {
    fetchEquipList()
      .then(res => setEquips(res.equips || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEquip) { setEnchant(null); return; }
    fetchEnchantInfo(selectedEquip)
      .then(setEnchant)
      .catch(() => setEnchant(null));
  }, [selectedEquip]);

  const handleEnchant = useCallback(async (runeLevel: number) => {
    if (!selectedEquip) return;
    setEnchanting(true);
    setResultMsg('');
    try {
      const result = await applyEnchant(selectedEquip, runeLevel);
      const prevLevel = enchant?.enchantLevel ?? 0;
      if (result.enchantLevel > prevLevel) {
        setResultMsg(`附魔成功！等级 ${prevLevel} → ${result.enchantLevel}`);
      } else {
        setResultMsg('附魔失败，保底次数+1');
      }
      setEnchant(result);
    } catch {
      setResultMsg('附魔失败');
    }
    setEnchanting(false);
  }, [selectedEquip, enchant]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>附魔</h2>
        <p className={styles.subtitle}>集七世之力，铸不世之器</p>
      </div>
      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : (
          <>
            {/* 选择装备 */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>选择装备</h3>
              {equips.length > 0 ? (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {equips.map(e => (
                    <button
                      key={e.id}
                      className={styles.optionBtn}
                      style={selectedEquip === e.id ? { borderColor: 'var(--gold)', background: 'rgba(201,168,76,0.15)', color: 'var(--gold-dim)' } : undefined}
                      onClick={() => setSelectedEquip(e.id === selectedEquip ? null : e.id)}
                    >
                      Lv.{e.level} {e.itemTypeId}
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.5 }}>暂无装备</p>
              )}
            </section>

            {/* 附魔信息 */}
            {enchant && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>附魔状态</h3>
                <div style={{
                  padding: '12px', background: 'var(--paper-dark)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--paper-darker)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--ink)' }}>附魔等级</span>
                    <span style={{ fontSize: '16px', color: 'var(--gold)', fontWeight: 700 }}>+{enchant.enchantLevel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.6 }}>属性加成</span>
                    <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{enchant.attributeBonusPercent}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.6 }}>保底次数</span>
                    <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{enchant.guaranteeCount}</span>
                  </div>
                </div>
              </section>
            )}

            {/* 符文选择 */}
            {selectedEquip && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>选择符文</h3>
                <div className={styles.cardList}>
                  {RUNE_LEVELS.map(r => (
                    <div key={r.level} className={styles.card} style={{ cursor: 'default' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p className={styles.cardTitle}>{r.name}</p>
                          <p className={styles.cardMeta}>{r.desc}</p>
                          <p style={{ fontSize: '11px', color: 'var(--gold-dim)', marginTop: '2px' }}>{r.cost}</p>
                        </div>
                        <button
                          className={styles.actionBtn}
                          style={{ marginTop: 0, fontSize: '12px', padding: '6px 14px' }}
                          disabled={enchanting}
                          onClick={() => handleEnchant(r.level)}
                        >
                          {enchanting ? '...' : '附魔'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 结果提示 */}
            {resultMsg && (
              <div style={{
                textAlign: 'center', padding: '12px', marginTop: '12px',
                background: resultMsg.includes('成功') ? 'rgba(76,175,80,0.1)' : 'rgba(196,68,68,0.1)',
                borderRadius: 'var(--radius-md)',
                color: resultMsg.includes('成功') ? 'var(--green, #4caf50)' : 'var(--red, #c44)',
                fontWeight: 600, fontSize: '14px',
              }}>
                {resultMsg}
              </div>
            )}

            {!selectedEquip && equips.length > 0 && (
              <div className={styles.empty} style={{ marginTop: '20px' }}>
                <span className={styles.placeholderIcon}>✨</span>
                <p>选择一件装备进行附魔</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
