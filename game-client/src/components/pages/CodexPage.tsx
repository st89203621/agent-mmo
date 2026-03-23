import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchCodexNpc, fetchCodexEquip, fetchCodexPet,
  type CodexNpcData, type CodexEquipData, type CodexPetData,
} from '../../services/api';
import styles from './PageSkeleton.module.css';

type Tab = 'npc' | 'equip' | 'pet';

const QUALITY_NAMES = ['普通', '精良', '稀有', '史诗', '传说', '神话'];

export default function CodexPage() {
  const [tab, setTab] = useState<Tab>('npc');
  const [npcs, setNpcs] = useState<CodexNpcData[]>([]);
  const [equips, setEquips] = useState<CodexEquipData[]>([]);
  const [pets, setPets] = useState<CodexPetData[]>([]);
  const [stats, setStats] = useState({ npcTotal: 0, npcUnlocked: 0, equipTypes: 0, petTotal: 0, petUnlocked: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [npcRes, equipRes, petRes] = await Promise.all([
        fetchCodexNpc(), fetchCodexEquip(), fetchCodexPet(),
      ]);
      setNpcs(npcRes.npcs || []);
      setEquips(equipRes.equips || []);
      setPets(petRes.pets || []);
      setStats({
        npcTotal: npcRes.total, npcUnlocked: npcRes.unlocked,
        equipTypes: equipRes.totalTypes,
        petTotal: petRes.total, petUnlocked: petRes.unlocked,
      });
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>图鉴</h2>
        <p className={styles.subtitle}>
          NPC {stats.npcUnlocked}/{stats.npcTotal} · 装备 {stats.equipTypes}种 · 宠物 {stats.petUnlocked}/{stats.petTotal}
        </p>
      </div>

      <div className={styles.tabRow}>
        {([['npc', '角色'], ['equip', '装备'], ['pet', '宠物']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} className={`${styles.tab} ${tab === k ? styles.tabActive : ''}`}
            onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : tab === 'npc' ? (
          npcs.length > 0 ? (
            <div className={styles.cardList}>
              {npcs.map(npc => (
                <div key={npc.npcId} className={`${styles.card} ${!npc.unlocked ? styles.cardLocked : ''}`}
                  style={{ cursor: 'default' }}>
                  <p className={styles.cardTitle}>{npc.unlocked ? npc.npcName : '???'}</p>
                  <p className={styles.cardMeta}>
                    {npc.unlocked ? `${npc.role} · ${npc.personality}` : '未解锁'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.placeholderIcon}>📕</span>
              <p>探索更多世界以解锁图鉴</p>
            </div>
          )
        ) : tab === 'equip' ? (
          equips.length > 0 ? (
            <div className={styles.cardList}>
              {equips.map((e, i) => (
                <div key={i} className={styles.card} style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className={styles.cardTitle}>{e.itemTypeId}</p>
                    <span className={styles.cardMeta}>Lv.{e.level} · {QUALITY_NAMES[e.quality] || '普通'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.placeholderIcon}>⚔️</span>
              <p>暂无装备记录</p>
            </div>
          )
        ) : (
          pets.length > 0 ? (
            <div className={styles.cardList}>
              {pets.map(p => (
                <div key={p.id} className={`${styles.card} ${!p.unlocked ? styles.cardLocked : ''}`}
                  style={{ cursor: 'default' }}>
                  <p className={styles.cardTitle}>{p.unlocked ? p.name : '???'}</p>
                  {p.unlocked && p.description && (
                    <p className={styles.cardDesc}>{p.description}</p>
                  )}
                  {!p.unlocked && <p className={styles.cardMeta}>未收集</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.placeholderIcon}>🐾</span>
              <p>暂无宠物记录</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
