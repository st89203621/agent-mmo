import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  fetchEquipList, fetchEnchantInfo, applyEnchant, prestigeEnchant,
  upgradeEquipGrade, furnaceUpgrade,
  type EquipData, type EnchantData,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import styles from './PageSkeleton.module.css';

const RUNE_LEVELS = [
  { level: 1, name: '小型符文', desc: '附魔+1级 · 成功率30%', cost: '100金币' },
  { level: 2, name: '中型符文', desc: '附魔+1级 · 成功率20%', cost: '200金币' },
  { level: 3, name: '大型符文', desc: '附魔+1级 · 成功率15%', cost: '300金币' },
  { level: 4, name: '超级符文', desc: '附魔+1级 · 成功率10%', cost: '500金币' },
];

type Tab = 'enchant' | 'grade';

export default function EnchantPage() {
  const { pageParams } = useGameStore();
  const [tab, setTab] = useState<Tab>('enchant');
  const [equips, setEquips] = useState<EquipData[]>([]);
  const [selectedEquip, setSelectedEquip] = useState<string | null>((pageParams?.equipId as string) || null);
  const [enchant, setEnchant] = useState<EnchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  const loadEquips = useCallback(() => {
    fetchEquipList()
      .then(res => setEquips(res.equips || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadEquips(); }, [loadEquips]);

  useEffect(() => {
    if (!selectedEquip) { setEnchant(null); return; }
    fetchEnchantInfo(selectedEquip).then(setEnchant).catch(() => setEnchant(null));
  }, [selectedEquip]);

  const handleMaterialEnchant = useCallback(async (runeLevel: number) => {
    if (!selectedEquip) return;
    setOperating(true); setResultMsg('');
    try {
      const prev = enchant?.enchantLevel ?? 0;
      const result = await applyEnchant(selectedEquip, runeLevel);
      setResultMsg(result.enchantLevel > prev
        ? `材料附魔成功！魔${prev} → 魔${result.enchantLevel}`
        : `附魔失败，保底次数 ${result.guaranteeCount}/8`);
      setEnchant(result);
    } catch { setResultMsg('附魔失败'); }
    setOperating(false);
  }, [selectedEquip, enchant]);

  const handlePrestigeEnchant = useCallback(async () => {
    if (!selectedEquip) return;
    setOperating(true); setResultMsg('');
    try {
      const prev = enchant?.enchantLevel ?? 0;
      const result = await prestigeEnchant(selectedEquip);
      if (result.enchantLevel > prev) {
        setResultMsg(`声望附魔成功！魔${prev} → 魔${result.enchantLevel}`);
      } else {
        setResultMsg(`声望附魔失败！魔${prev} → 魔${result.enchantLevel}（降2级）`);
      }
      setEnchant(result);
    } catch { setResultMsg('附魔失败'); }
    setOperating(false);
  }, [selectedEquip, enchant]);

  const handleGradeUp = useCallback(async () => {
    if (!selectedEquip) return;
    setOperating(true); setResultMsg('');
    try {
      const result = await upgradeEquipGrade(selectedEquip);
      const eq = equips.find(e => e.id === selectedEquip);
      const prevGrade = eq?.grade ?? 0;
      if (result.grade > prevGrade) {
        setResultMsg(`加品成功！品+${result.grade}，属性提升至${result.attrTotal}`);
        toast.success('加品成功');
      } else {
        setResultMsg('加品失败，下次好运');
      }
      loadEquips();
    } catch { setResultMsg('加品失败'); }
    setOperating(false);
  }, [selectedEquip, equips, loadEquips]);

  const handleFurnace = useCallback(async () => {
    if (!selectedEquip) return;
    setOperating(true); setResultMsg('');
    try {
      const result = await furnaceUpgrade(selectedEquip);
      const eq = equips.find(e => e.id === selectedEquip);
      const prev = eq?.furnaceGrade ?? 0;
      if (result.furnaceGrade > prev) {
        setResultMsg(`鬼炉成功！炉+${result.furnaceGrade}，属性提升至${result.attrTotal}`);
        toast.success('鬼炉提升成功');
      } else {
        setResultMsg('鬼炉失败');
      }
      loadEquips();
    } catch { setResultMsg('鬼炉失败'); }
    setOperating(false);
  }, [selectedEquip, equips, loadEquips]);

  const selEquip = equips.find(e => e.id === selectedEquip);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>强化</h2>
        <p className={styles.subtitle}>附魔10级提升300% / 加品21级 / 鬼炉30级</p>
      </div>

      <div className={styles.tabRow}>
        <button className={`${styles.tabBtn} ${tab === 'enchant' ? styles.tabActive : ''}`}
                onClick={() => setTab('enchant')}>附魔</button>
        <button className={`${styles.tabBtn} ${tab === 'grade' ? styles.tabActive : ''}`}
                onClick={() => setTab('grade')}>加品 / 鬼炉</button>
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
                    <button key={e.id} className={styles.optionBtn}
                      style={selectedEquip === e.id ? { borderColor: 'var(--gold)', background: 'rgba(201,168,76,0.15)' } : undefined}
                      onClick={() => setSelectedEquip(e.id === selectedEquip ? null : e.id)}>
                      Lv.{e.level} {e.grade > 0 ? `品+${e.grade}` : ''} {e.furnaceGrade > 0 ? `炉+${e.furnaceGrade}` : ''}
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', opacity: 0.5 }}>暂无装备</p>
              )}
            </section>

            {tab === 'enchant' && (
              <>
                {/* 附魔状态 */}
                {enchant && (
                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>附魔状态</h3>
                    <div className={styles.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13 }}>附魔等级</span>
                        <span style={{ fontSize: 16, color: 'var(--gold)', fontWeight: 700 }}>魔{enchant.enchantLevel}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, opacity: 0.6 }}>属性加成</span>
                        <span style={{ fontSize: 13 }}>{enchant.attributeBonusPercent}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, opacity: 0.6 }}>保底次数</span>
                        <span style={{ fontSize: 13 }}>{enchant.guaranteeCount}/8</span>
                      </div>
                      {/* 进度条 */}
                      <div style={{ marginTop: 8, height: 6, background: 'var(--paper-darker)', borderRadius: 3 }}>
                        <div style={{ width: `${enchant.enchantLevel * 10}%`, height: '100%', background: 'var(--gold)', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </section>
                )}

                {/* 材料附魔（1-6级） */}
                {selectedEquip && (
                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>材料附魔（1~6级）</h3>
                    <div className={styles.cardList}>
                      {RUNE_LEVELS.map(r => (
                        <div key={r.level} className={styles.card}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p className={styles.cardTitle}>{r.name}</p>
                              <p className={styles.cardMeta}>{r.desc}</p>
                              <p style={{ fontSize: 11, color: 'var(--gold-dim)', marginTop: 2 }}>{r.cost}</p>
                            </div>
                            <button className={styles.actionBtn}
                              style={{ marginTop: 0, fontSize: 12, padding: '6px 14px' }}
                              disabled={operating || (enchant?.enchantLevel ?? 0) >= 6}
                              onClick={() => handleMaterialEnchant(r.level)}>
                              {operating ? '...' : (enchant?.enchantLevel ?? 0) >= 6 ? '已满' : '附魔'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 声望/荣誉附魔（4级以上，可到10级） */}
                {selectedEquip && (enchant?.enchantLevel ?? 0) >= 4 && (
                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>声望附魔（4~10级，失败降2级）</h3>
                    <div className={styles.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p className={styles.cardTitle}>声望/荣誉附魔</p>
                          <p className={styles.cardMeta}>
                            成功率 {Math.round((11 - (enchant?.enchantLevel ?? 0)) * 8)}% · 失败降2级
                          </p>
                        </div>
                        <button className={styles.actionBtn}
                          style={{ marginTop: 0, fontSize: 12, padding: '6px 14px', background: 'rgba(211,92,138,0.15)', borderColor: '#d35c8a', color: '#d35c8a' }}
                          disabled={operating || (enchant?.enchantLevel ?? 0) >= 10}
                          onClick={handlePrestigeEnchant}>
                          {operating ? '...' : (enchant?.enchantLevel ?? 0) >= 10 ? '已满' : '声望附魔'}
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}

            {tab === 'grade' && selectedEquip && (
              <>
                {/* 加品 */}
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>装备加品（35级后可用，最高+21）</h3>
                  <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span>当前品级</span>
                      <span style={{ fontWeight: 700, color: 'var(--gold)' }}>+{selEquip?.grade ?? 0}</span>
                    </div>
                    <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.6 }}>
                      成功率：{Math.round((22 - (selEquip?.grade ?? 0)) * 4)}% · 每级提升属性5%
                    </div>
                    <div style={{ height: 6, background: 'var(--paper-darker)', borderRadius: 3, marginBottom: 10 }}>
                      <div style={{ width: `${((selEquip?.grade ?? 0) / 21) * 100}%`, height: '100%', background: '#e8a642', borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                    <button className={styles.primaryBtn} disabled={operating || (selEquip?.grade ?? 0) >= 21}
                      onClick={handleGradeUp}>
                      {operating ? '加品中...' : (selEquip?.grade ?? 0) >= 21 ? '已满级' : '加品'}
                    </button>
                  </div>
                </section>

                {/* 鬼炉 */}
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>鬼炉（品+21后可用，最高+30）</h3>
                  <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span>鬼炉品质</span>
                      <span style={{ fontWeight: 700, color: '#d35c8a' }}>+{selEquip?.furnaceGrade ?? 0}</span>
                    </div>
                    <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.6 }}>
                      成功率：{Math.round((31 - (selEquip?.furnaceGrade ?? 0)) * 3)}% · 每级提升属性3%
                    </div>
                    <div style={{ height: 6, background: 'var(--paper-darker)', borderRadius: 3, marginBottom: 10 }}>
                      <div style={{ width: `${((selEquip?.furnaceGrade ?? 0) / 30) * 100}%`, height: '100%', background: '#d35c8a', borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                    <button className={styles.primaryBtn}
                      disabled={operating || (selEquip?.grade ?? 0) < 21 || (selEquip?.furnaceGrade ?? 0) >= 30}
                      style={(selEquip?.grade ?? 0) >= 21 ? { background: 'rgba(211,92,138,0.15)', borderColor: '#d35c8a', color: '#d35c8a' } : undefined}
                      onClick={handleFurnace}>
                      {operating ? '鬼炉中...' : (selEquip?.grade ?? 0) < 21 ? '需品+21' : (selEquip?.furnaceGrade ?? 0) >= 30 ? '已满级' : '鬼炉锻造'}
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* 结果提示 */}
            {resultMsg && (
              <div style={{
                textAlign: 'center', padding: 12, marginTop: 12,
                background: resultMsg.includes('成功') ? 'rgba(76,175,80,0.1)' : 'rgba(196,68,68,0.1)',
                borderRadius: 'var(--radius-md)',
                color: resultMsg.includes('成功') ? 'var(--green, #4caf50)' : 'var(--red, #c44)',
                fontWeight: 600, fontSize: 14,
              }}>
                {resultMsg}
              </div>
            )}

            {!selectedEquip && equips.length > 0 && (
              <div className={styles.empty} style={{ marginTop: 20 }}>
                <span className={styles.placeholderIcon}>✨</span>
                <p>选择一件装备进行强化</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
