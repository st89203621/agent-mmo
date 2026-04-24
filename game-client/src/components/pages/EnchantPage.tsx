import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  fetchEquipList,
  fetchEnchantInfo,
  applyEnchant,
  prestigeEnchant,
  upgradeEquipGrade,
  furnaceUpgrade,
  type EquipData,
  type EnchantData,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import { QUALITY_NAMES } from '../../constants/quality';
import styles from './lunhui/LunhuiPages.module.css';

const TABS: { key: Tab; label: string }[] = [
  { key: 'enchant', label: '附魂台' },
  { key: 'grade', label: '加品 · 鬼炉' },
];

type Tab = 'enchant' | 'grade';

const RUNE_SLOTS: { level: number; name: string; icon: string; costText: string }[] = [
  { level: 1, name: '小型符文', icon: '◆', costText: '100 金币' },
  { level: 2, name: '中型符文', icon: '✦', costText: '200 金币' },
  { level: 3, name: '大型符文', icon: '◉', costText: '300 金币' },
  { level: 4, name: '超级符文', icon: '✧', costText: '500 金币' },
];

const POSITION_NAME: Record<number, string> = {
  1: '武器', 2: '护甲', 3: '饰品', 4: '护腕', 5: '战靴', 6: '戒指', 7: '项链', 8: '腰带',
};

const PITY_TOTAL = 8;
const ENCH_MAX = 10;
const GRADE_MAX = 21;
const FURNACE_MAX = 30;

function equipLabel(e: EquipData) {
  return e.name || POSITION_NAME[e.position] || e.itemTypeId;
}

function enchSuccessRate(level: number, rune: number) {
  const base = Math.max(5, 60 - level * 8);
  const bonus = rune * 3;
  return Math.min(95, base + bonus);
}

function prestigeSuccessRate(level: number) {
  return Math.max(10, (11 - level) * 8);
}

function gradeSuccessRate(grade: number) {
  return Math.max(5, (22 - grade) * 4);
}

function furnaceSuccessRate(furnace: number) {
  return Math.max(5, (31 - furnace) * 3);
}

export default function EnchantPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const pageParams = useGameStore((s) => s.pageParams);

  const [tab, setTab] = useState<Tab>('enchant');
  const [equips, setEquips] = useState<EquipData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>((pageParams?.equipId as string) || null);
  const [enchant, setEnchant] = useState<EnchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'fail' } | null>(null);

  const loadEquips = useCallback(async () => {
    const res = await fetchEquipList().catch(() => ({ equips: [] as EquipData[] }));
    setEquips(res.equips || []);
    if (!selectedId && res.equips && res.equips.length > 0) {
      setSelectedId(res.equips[0].id);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { loadEquips(); }, [loadEquips]);

  useEffect(() => {
    if (!selectedId) {
      setEnchant(null);
      return;
    }
    fetchEnchantInfo(selectedId)
      .then(setEnchant)
      .catch(() => setEnchant(null));
  }, [selectedId]);

  const selected = useMemo(
    () => equips.find((e) => e.id === selectedId) ?? null,
    [equips, selectedId],
  );

  const enchLevel = enchant?.enchantLevel ?? 0;
  const bonusPct = enchant?.attributeBonusPercent ?? 0;
  const pity = enchant?.guaranteeCount ?? 0;

  const projectedBonus = useMemo(() => {
    if (!enchant) return bonusPct;
    const nextLevel = Math.min(ENCH_MAX, enchLevel + 1);
    return Math.round((bonusPct / Math.max(1, enchLevel)) * nextLevel) || (nextLevel * 30);
  }, [enchant, enchLevel, bonusPct]);

  const showMessage = useCallback((text: string, kind: 'success' | 'fail') => {
    setMessage({ text, kind });
    window.setTimeout(() => setMessage((m) => (m && m.text === text ? null : m)), 3500);
  }, []);

  const handleApplyRune = useCallback(async (runeLevel: number) => {
    if (!selected) return;
    setOperating(true);
    try {
      const prev = enchLevel;
      const result = await applyEnchant(selected.id, runeLevel);
      setEnchant(result);
      if (result.enchantLevel > prev) {
        toast.reward(`附魂 ${prev} → ${result.enchantLevel}`);
        showMessage(`附魂成功 · 等级 ${prev} → ${result.enchantLevel}`, 'success');
      } else {
        showMessage(`附魂未果 · 保底 ${result.guaranteeCount}/${PITY_TOTAL}`, 'fail');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '附魂失败');
    }
    setOperating(false);
  }, [selected, enchLevel, showMessage]);

  const handlePrestige = useCallback(async () => {
    if (!selected) return;
    setOperating(true);
    try {
      const prev = enchLevel;
      const result = await prestigeEnchant(selected.id);
      setEnchant(result);
      if (result.enchantLevel > prev) {
        toast.reward(`声望附魂 ${prev} → ${result.enchantLevel}`);
        showMessage(`声望附魂成功 · 等级 ${prev} → ${result.enchantLevel}`, 'success');
      } else {
        showMessage(`声望附魂失败 · 等级 ${prev} → ${result.enchantLevel}（降 2 级）`, 'fail');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '声望附魂失败');
    }
    setOperating(false);
  }, [selected, enchLevel, showMessage]);

  const handleGradeUp = useCallback(async () => {
    if (!selected) return;
    setOperating(true);
    try {
      const prevGrade = selected.grade;
      const result = await upgradeEquipGrade(selected.id);
      if (result.grade > prevGrade) {
        toast.reward(`加品成功 · +${result.grade}`);
        showMessage(`加品成功 · 品 +${prevGrade} → +${result.grade}`, 'success');
      } else {
        showMessage('加品未果 · 下次好运', 'fail');
      }
      await loadEquips();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加品失败');
    }
    setOperating(false);
  }, [selected, loadEquips, showMessage]);

  const handleFurnace = useCallback(async () => {
    if (!selected) return;
    setOperating(true);
    try {
      const prev = selected.furnaceGrade;
      const result = await furnaceUpgrade(selected.id);
      if (result.furnaceGrade > prev) {
        toast.reward(`鬼炉成功 · 炉 +${result.furnaceGrade}`);
        showMessage(`鬼炉成功 · 炉 +${prev} → +${result.furnaceGrade}`, 'success');
      } else {
        showMessage('鬼炉未果 · 下次好运', 'fail');
      }
      await loadEquips();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '鬼炉失败');
    }
    setOperating(false);
  }, [selected, loadEquips, showMessage]);

  const renderEquipChips = () => (
    <div className={styles.enchEquipScroll}>
      {equips.length === 0 ? (
        <span style={{ padding: '6px 12px', color: 'var(--text-dim)', fontSize: 11 }}>
          尚无装备 · 先去获取
        </span>
      ) : (
        equips.map((e) => {
          const active = e.id === selectedId;
          return (
            <button
              key={e.id}
              className={`${styles.enchEquipChip} ${active ? styles.enchEquipChipOn : ''}`.trim()}
              onClick={() => setSelectedId(e.id)}
              type="button"
            >
              {equipLabel(e)}
              <span className={styles.enchEquipChipSub}>
                Lv{e.level} · {QUALITY_NAMES[e.quality] || '普通'}
                {e.grade > 0 && ` · 品+${e.grade}`}
              </span>
            </button>
          );
        })
      )}
    </div>
  );

  const renderEnchant = () => {
    if (!selected) {
      return <div className={styles.enchEmpty}>从上方选择一件装备开始附魂</div>;
    }
    const pityDots = Array.from({ length: PITY_TOTAL }, (_, i) => {
      if (i < pity) return 'fail';
      if (i === PITY_TOTAL - 1) return 'crit';
      return 'empty';
    });
    const maxed = enchLevel >= ENCH_MAX;

    return (
      <>
        <div className={styles.enchStage}>
          <span className={styles.enchRune} />
          <span className={`${styles.enchRune} ${styles.enchRuneOuter}`} />
          <div className={styles.enchTarget}>
            <div className={styles.enchTargetName}>{equipLabel(selected)}</div>
            <div className={styles.enchTargetLv}>
              Lv{selected.level} · {QUALITY_NAMES[selected.quality] || '普通'}
              {selected.grade > 0 && ` · 品+${selected.grade}`}
              {selected.furnaceGrade > 0 && ` · 炉+${selected.furnaceGrade}`}
            </div>
            <div className={styles.enchTargetHint}>
              当前附魂 · 魂 {enchLevel}
            </div>
          </div>

          <div className={styles.enchSlots}>
            {RUNE_SLOTS.map((rune, i) => {
              const successRate = enchSuccessRate(enchLevel, rune.level);
              const locked = operating || maxed;
              const isMain = i === 0;
              return (
                <button
                  key={rune.level}
                  className={[
                    styles.enchSlot,
                    isMain ? styles.enchSlotMain : '',
                    locked ? styles.enchSlotLocked : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => !locked && handleApplyRune(rune.level)}
                  disabled={locked}
                  type="button"
                >
                  <span className={styles.enchSlotIc}>{rune.icon}</span>
                  <span className={styles.enchSlotNm}>{rune.name}</span>
                  <span className={styles.enchSlotX}>
                    {maxed ? '已满' : `约 ${successRate}%`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.enchAttr}>
          <div className={styles.enchAttrRow}>
            <span className={styles.enchAttrN}>附魂等级</span>
            <span className={styles.enchAttrA}>魂 {enchLevel}</span>
            <span className={styles.enchAttrArrow}>→</span>
            <span className={styles.enchAttrB}>魂 {Math.min(ENCH_MAX, enchLevel + 1)}</span>
            <span className={styles.enchAttrD}>上限 {ENCH_MAX}</span>
          </div>
          <div className={styles.enchAttrRow}>
            <span className={styles.enchAttrN}>属性加成</span>
            <span className={styles.enchAttrA}>+{bonusPct}%</span>
            <span className={styles.enchAttrArrow}>→</span>
            <span className={styles.enchAttrB}>+{projectedBonus}%</span>
            <span className={styles.enchAttrD}>下一级预期</span>
          </div>
          <div className={styles.enchAttrRow}>
            <span className={styles.enchAttrN}>总属性</span>
            <span className={styles.enchAttrA}>{enchant?.totalAttributeBonus ?? 0}</span>
            <span className={styles.enchAttrArrow}>→</span>
            <span className={styles.enchAttrB}>
              {Math.round((enchant?.totalAttributeBonus ?? 0) * (1 + 1 / Math.max(1, enchLevel)))}
            </span>
            <span className={styles.enchAttrD}>估值</span>
          </div>
        </div>

        <div className={styles.enchPityLine}>
          <span>保 底 · {pity >= PITY_TOTAL ? '下次必中神铸' : `第 ${PITY_TOTAL} 次必中`}</span>
          <span className={styles.enchPityLineVal}>{pity} / {PITY_TOTAL}</span>
        </div>
        <div className={styles.enchPity}>
          {pityDots.map((d, i) => (
            <span
              key={i}
              className={[
                styles.enchPityDot,
                d === 'fail' ? styles.enchPityDotFail : '',
                d === 'crit' ? styles.enchPityDotCrit : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </div>

        <div className={styles.enchAction}>
          <button
            className={styles.enchActionSec}
            onClick={() => navigateTo('codex')}
            type="button"
          >
            查 史
          </button>
          <button
            className={styles.enchActionPri}
            onClick={handlePrestige}
            disabled={operating || enchLevel < 4 || enchLevel >= ENCH_MAX}
            type="button"
          >
            {enchLevel < 4
              ? `声望附魂 · 需魂 4（当前 ${enchLevel}）`
              : enchLevel >= ENCH_MAX
                ? '已 达 极 致'
                : `✦ 声望附魂 · 约 ${prestigeSuccessRate(enchLevel)}%`}
          </button>
        </div>
      </>
    );
  };

  const renderGrade = () => {
    if (!selected) {
      return <div className={styles.enchEmpty}>从上方选择一件装备开始加品/鬼炉</div>;
    }
    const gradeDone = selected.grade >= GRADE_MAX;
    const furnaceLocked = selected.grade < GRADE_MAX;
    const furnaceDone = selected.furnaceGrade >= FURNACE_MAX;

    return (
      <>
        <div className={styles.enchGradePanel}>
          <div className={styles.enchGradeTitle}>装 备 加 品</div>
          <div className={styles.enchGradeRow}>
            <span>当前品级</span>
            <b>+{selected.grade}</b>
          </div>
          <div className={styles.enchGradeRow}>
            <span>成功率</span>
            <span>{gradeDone ? '—' : `${gradeSuccessRate(selected.grade)}%`}</span>
          </div>
          <div className={styles.enchGradeRow}>
            <span>每级属性提升</span>
            <span>+5%</span>
          </div>
          <div className={styles.enchProgress}>
            <div
              className={styles.enchProgressFill}
              style={{ width: `${(selected.grade / GRADE_MAX) * 100}%` }}
            />
          </div>
          <button
            className={styles.enchGradeBtn}
            onClick={handleGradeUp}
            disabled={operating || gradeDone}
            type="button"
          >
            {operating ? '加 品 中 ...' : gradeDone ? '已 达 +21 满 品' : '✦ 加 品'}
          </button>
        </div>

        <div className={styles.enchGradePanel}>
          <div className={styles.enchGradeTitle}>鬼 炉 · 熔 锻</div>
          <div className={`${styles.enchGradeRow} ${styles.enchGradeRowRose}`}>
            <span>鬼炉品级</span>
            <b>+{selected.furnaceGrade}</b>
          </div>
          <div className={styles.enchGradeRow}>
            <span>成功率</span>
            <span>{furnaceDone || furnaceLocked ? '—' : `${furnaceSuccessRate(selected.furnaceGrade)}%`}</span>
          </div>
          <div className={styles.enchGradeRow}>
            <span>每级属性提升</span>
            <span>+3%</span>
          </div>
          <div className={styles.enchProgress}>
            <div
              className={`${styles.enchProgressFill} ${styles.enchProgressFillRose}`}
              style={{ width: `${(selected.furnaceGrade / FURNACE_MAX) * 100}%` }}
            />
          </div>
          <button
            className={`${styles.enchGradeBtn} ${styles.enchGradeBtnRose}`}
            onClick={handleFurnace}
            disabled={operating || furnaceLocked || furnaceDone}
            type="button"
          >
            {furnaceLocked
              ? '需 品 +21 方 可 入 炉'
              : furnaceDone
                ? '已 达 +30 满 炉'
                : operating ? '鬼 炉 中 ...' : '✦ 鬼 炉 锻 造'}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>附 魂 台</span>
            <span className={styles.appbarZone}>神 匠 · 九 重 烛 龙 炉</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('codex')} type="button" aria-label="史">史</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('inventory')} type="button" aria-label="包">包</button>
          </div>
        </div>
      </div>

      <div className={styles.enchTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.enchTab} ${tab === t.key ? styles.enchTabOn : ''}`.trim()}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {renderEquipChips()}

      {loading ? (
        <div className={styles.enchEmpty}>装备载入中...</div>
      ) : (
        <div className={styles.scrollPlain}>
          {tab === 'enchant' ? renderEnchant() : renderGrade()}
          {message && (
            <div
              className={[
                styles.enchMsg,
                message.kind === 'success' ? styles.enchMsgSuccess : styles.enchMsgFail,
              ].filter(Boolean).join(' ')}
            >
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
