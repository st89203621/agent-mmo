import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { fetchPets, deletePet, type PetData } from '../../services/api';
import { toast } from '../../store/toastStore';
import { BarBlock, BarRow } from '../common/fusion';
import VisualAssetImage from '../common/VisualAssetImage';
import { petPortraitAsset } from '../../data/visualAssets';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const ELEMENT_LABEL: Record<string, string> = {
  fire: '烈焰', ice: '寒冰', thunder: '雷霆', wind: '疾风',
  earth: '厚土', water: '清流', light: '圣光', dark: '幽冥',
};

const PET_TYPE_LABEL: Record<string, string> = {
  beast: '神兽', mythical: '灵禽', insect: '虫妖', dragon: '真龙',
  human: '仙人', spirit: '精魄',
};

const EXP_PER_LEVEL = 1000;

const ACTIONS: { key: string; label: string; icon: string; red?: boolean }[] = [
  { key: 'feed', label: '喂食', icon: '喂' },
  { key: 'smash', label: '砸宠', icon: '砸', red: true },
  { key: 'evolve', label: '进阶', icon: '进' },
  { key: 'wash', label: '洗炼', icon: '洗' },
  { key: 'bless', label: '祈福', icon: '祈' },
  { key: 'rename', label: '改名', icon: '改' },
  { key: 'stable', label: '入厩', icon: '收' },
  { key: 'release', label: '放生', icon: '放', red: true },
];

export default function PetPage() {
  usePageBackground(PAGE_BG.PET);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [pets, setPets] = useState<PetData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);

  const loadPets = useCallback(() => {
    setLoading(true);
    fetchPets()
      .then((res) => {
        setPets(res.pets || []);
        setSelectedId((prev) => prev ?? res.pets?.[0]?.id ?? null);
      })
      .catch(() => setPets([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPets(); }, [loadPets]);

  const selected = useMemo(
    () => pets.find((p) => p.id === selectedId) ?? pets[0] ?? null,
    [pets, selectedId],
  );

  const handleAction = useCallback(async (key: string) => {
    if (!selected) return;
    if (key === 'release') {
      if (!window.confirm(`确认放生「${selected.nickname || selected.petTemplateId}」？`)) return;
      setOperating(true);
      try {
        await deletePet(selected.id);
        toast.success('已放生');
        setSelectedId(null);
        loadPets();
      } catch {
        toast.error('放生失败');
      }
      setOperating(false);
      return;
    }
    if (key === 'stable') {
      navigateTo('pet-summon');
      return;
    }
    toast.info(`${ACTIONS.find((a) => a.key === key)?.label ?? '功能'}开发中`);
  }, [selected, loadPets, navigateTo]);

  const rosterSlots = 5;
  const roster = Array.from({ length: rosterSlots }, (_, i) => pets[i] ?? null);
  const activePet = selected;
  const expInLevel = activePet ? activePet.mutationExp % EXP_PER_LEVEL : 0;
  const totalQual = activePet
    ? activePet.constitution + activePet.magicPower + activePet.power + activePet.endurance + activePet.agile
    : 0;

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>宝 宝</span>
            <span className={styles.appbarZone}>
              {activePet ? `${activePet.nickname || activePet.petTemplateId} · 出战中` : '暂无宠物'}
            </span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('codex')} type="button">鉴</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('pet-summon')} type="button">助</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        {loading ? (
          <div className={styles.feedEmpty}>宠物载入中...</div>
        ) : !activePet ? (
          <div className={styles.feedEmpty} style={{ padding: '40px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>尚未拥有宠物</p>
            <button className={styles.qsFast} onClick={() => navigateTo('pet-summon')} type="button">前往召唤</button>
          </div>
        ) : (
          <>
            <div className={styles.ptHero}>
              <div className={styles.ptPic}>
                <VisualAssetImage
                  {...petPortraitAsset({
                    petTemplateId: activePet.petTemplateId,
                    petType: activePet.petType,
                    element: activePet.element,
                    nickname: activePet.nickname,
                  })}
                  className={styles.ptPicImg}
                  showGenerate={false}
                  autoGenerate
                />
              </div>
              <div className={styles.ptStats}>
                <div className={styles.ptName}>
                  {activePet.nickname || activePet.petTemplateId}
                  {activePet.tierName && <span className={styles.ptTag}>{activePet.tierName}</span>}
                </div>
                <div className={styles.ptKv}>
                  <span>血统</span>
                  <span className="v">{PET_TYPE_LABEL[activePet.petType] || activePet.petType || '灵兽'}</span>
                </div>
                <div className={styles.ptKv}>
                  <span>属性</span>
                  <span className="v">{ELEMENT_LABEL[activePet.element] || activePet.element || '—'}</span>
                </div>
                <div className={styles.ptKv}>
                  <span>进阶</span>
                  <span className="v">Lv {activePet.mutationNo}</span>
                </div>
                <div className={styles.ptKv}>
                  <span>资质</span>
                  <span className="v">{totalQual}<span className="up">+{activePet.propertyPointNum}</span></span>
                </div>
                <div className={styles.ptKv}>
                  <span>攻击</span>
                  <span className="v">{activePet.power}<span className="up">+{activePet.power >> 3}</span></span>
                </div>
                <div className={styles.ptKv}>
                  <span>防御</span>
                  <span className="v">{activePet.endurance}<span className="up">+{activePet.endurance >> 3}</span></span>
                </div>
                <div className={styles.ptKv}>
                  <span>技能位</span>
                  <span className="v">{activePet.maxSkill}</span>
                </div>
              </div>
            </div>

            <BarBlock>
              <BarRow label="经验" kind="exp" current={expInLevel} max={EXP_PER_LEVEL} />
              <BarRow label="资质" kind="soul" current={activePet.propertyPointNum} max={100} />
            </BarBlock>

            <div className={styles.sectRow}>
              宠 物 列 表
              <span className={styles.sectMore}>{pets.length} / {rosterSlots} 槽</span>
            </div>

            <div className={styles.ptRoster}>
              {roster.map((pet, idx) => {
                if (!pet) {
                  return (
                    <button
                      key={`empty-${idx}`}
                      className={`${styles.ptSlot} ${styles.ptSlotEmp}`}
                      onClick={() => navigateTo('pet-summon')}
                      type="button"
                    >
                      <span>空</span>
                      <span className={styles.ptSlotN}>＋</span>
                    </button>
                  );
                }
                const on = pet.id === activePet.id;
                return (
                  <button
                    key={pet.id}
                    className={`${styles.ptSlot} ${on ? styles.ptSlotOn : ''}`.trim()}
                    onClick={() => setSelectedId(pet.id)}
                    type="button"
                  >
                    <span>{(pet.nickname || pet.petTemplateId).slice(0, 2)}</span>
                    <span className={styles.ptSlotN}>L{pet.mutationNo}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.sectRow}>宝 宝 操 作</div>

            <div className={styles.ptAct}>
              {ACTIONS.map((action) => (
                <button
                  key={action.key}
                  className={`${styles.ptActBtn} ${action.red ? styles.ptActRed : ''}`.trim()}
                  onClick={() => handleAction(action.key)}
                  disabled={operating}
                  type="button"
                >
                  <span className={styles.ptActIc}>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
