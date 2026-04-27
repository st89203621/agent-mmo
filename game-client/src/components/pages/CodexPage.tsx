import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  fetchCodexNpc, fetchCodexEquip, fetchCodexPet,
  type CodexNpcData, type CodexEquipData, type CodexPetData,
} from '../../services/api';
import { QUALITY_NAMES, QUALITY_COLORS } from '../../constants/quality';
import page from '../../styles/page.module.css';
import own from './CodexPage.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const styles = { ...page, ...own };

type Tab = 'npc' | 'equip' | 'pet';

type DetailItem =
  | { type: 'npc'; data: CodexNpcData }
  | { type: 'equip'; data: CodexEquipData }
  | { type: 'pet'; data: CodexPetData };

export default function CodexPage() {
  usePageBackground(PAGE_BG.CODEX);
  const { navigateTo } = useGameStore();
  const [tab, setTab] = useState<Tab>('npc');
  const [npcs, setNpcs] = useState<CodexNpcData[]>([]);
  const [equips, setEquips] = useState<CodexEquipData[]>([]);
  const [pets, setPets] = useState<CodexPetData[]>([]);
  const [stats, setStats] = useState({ npcTotal: 0, npcUnlocked: 0, equipTypes: 0, petTotal: 0, petUnlocked: 0 });
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailItem | null>(null);

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
            <div className={styles.codexGrid}>
              {npcs.map((npc) => (
                <button
                  key={npc.npcId}
                  className={`${styles.codexCard} ${!npc.unlocked ? styles.locked : ''}`}
                  onClick={() => npc.unlocked && setDetail({ type: 'npc', data: npc })}
                >
                  <div className={styles.codexAvatar}>
                    {npc.unlocked ? npc.npcName.charAt(0) : '?'}
                  </div>
                  <span className={styles.codexName}>{npc.unlocked ? npc.npcName : '???'}</span>
                  {npc.unlocked && <span className={styles.codexMeta}>{npc.role}</span>}
                  {!npc.unlocked && <span className={styles.codexLock}>未解锁</span>}
                </button>
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
            <div className={styles.codexGrid}>
              {equips.map((e, i) => (
                <button
                  key={i}
                  className={styles.codexCard}
                  style={{ borderColor: QUALITY_COLORS[e.quality] || QUALITY_COLORS[0] }}
                  onClick={() => setDetail({ type: 'equip', data: e })}
                >
                  <div className={styles.codexAvatar} style={{ color: QUALITY_COLORS[e.quality] || QUALITY_COLORS[0] }}>
                    ⚔
                  </div>
                  <span className={styles.codexName}>{e.itemTypeId}</span>
                  <span className={styles.codexMeta} style={{ color: QUALITY_COLORS[e.quality] }}>
                    {QUALITY_NAMES[e.quality] || '普通'} Lv.{e.level}
                  </span>
                </button>
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
            <div className={styles.codexGrid}>
              {pets.map((p) => (
                <button
                  key={p.id}
                  className={`${styles.codexCard} ${!p.unlocked ? styles.locked : ''}`}
                  onClick={() => p.unlocked && setDetail({ type: 'pet', data: p })}
                >
                  <div className={styles.codexAvatar}>
                    {p.unlocked ? '🐾' : '?'}
                  </div>
                  <span className={styles.codexName}>{p.unlocked ? p.name : '???'}</span>
                  {!p.unlocked && <span className={styles.codexLock}>未收集</span>}
                </button>
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

      {/* 详情弹窗 */}
      {detail && (
        <div className={styles.modalOverlay} onClick={() => setDetail(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setDetail(null)}>✕</button>

            {detail.type === 'npc' && (
              <>
                <div className={styles.modalAvatar}>{detail.data.npcName.charAt(0)}</div>
                <h3 className={styles.modalTitle}>{detail.data.npcName}</h3>
                <div className={styles.modalTags}>
                  <span className={styles.modalTag}>{detail.data.role}</span>
                  <span className={styles.modalTag}>{detail.data.personality}</span>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.modalBtn} onClick={() => { setDetail(null); navigateTo('story'); }}>
                    前去对话
                  </button>
                </div>
              </>
            )}

            {detail.type === 'equip' && (
              <>
                <div className={styles.modalAvatar} style={{ color: QUALITY_COLORS[detail.data.quality] }}>⚔</div>
                <h3 className={styles.modalTitle} style={{ color: QUALITY_COLORS[detail.data.quality] }}>
                  {detail.data.itemTypeId}
                </h3>
                <div className={styles.modalTags}>
                  <span className={styles.modalTag} style={{ borderColor: QUALITY_COLORS[detail.data.quality], color: QUALITY_COLORS[detail.data.quality] }}>
                    {QUALITY_NAMES[detail.data.quality] || '普通'}
                  </span>
                  <span className={styles.modalTag}>Lv.{detail.data.level}</span>
                </div>
                <p className={styles.modalDesc}>
                  一件{QUALITY_NAMES[detail.data.quality] || '普通'}品质的装备，等级为 {detail.data.level}。
                  可通过附魔和鉴定进一步提升属性。
                </p>
              </>
            )}

            {detail.type === 'pet' && (
              <>
                <div className={styles.modalAvatar}>🐾</div>
                <h3 className={styles.modalTitle}>{detail.data.name}</h3>
                {detail.data.description && (
                  <p className={styles.modalDesc}>{detail.data.description}</p>
                )}
                <div className={styles.modalActions}>
                  <button className={styles.modalBtn} onClick={() => { setDetail(null); navigateTo('pet'); }}>
                    查看宠物
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
