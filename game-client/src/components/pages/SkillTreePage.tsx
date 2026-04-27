import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import {
  fetchSkillTemplates,
  fetchPlayerSkills,
  unlockSkill,
  upgradeSkill,
  fetchPlayerCurrency,
  type SkillTemplateData,
  type PlayerSkillData,
} from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

type Branch = 'COMBAT' | 'EMOTION' | 'REBIRTH';

const BRANCHES: { key: Branch; label: string; icon: string }[] = [
  { key: 'COMBAT', label: '战 斗', icon: '锋' },
  { key: 'EMOTION', label: '情 感', icon: '缘' },
  { key: 'REBIRTH', label: '轮 回', icon: '☯' },
];

const EFFECT_LABELS: Record<string, string> = {
  physical_damage: '物理伤害',
  magic_damage: '魔法伤害',
  heal: '治疗',
  buff_defense: '防御增益',
};

function parseEffect(json?: string): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function buildTiers(skills: SkillTemplateData[]): SkillTemplateData[][] {
  const idSet = new Set(skills.map((s) => s.id));
  const tiers: SkillTemplateData[][] = [];
  const placed = new Set<string>();

  const tier0 = skills.filter(
    (s) => !s.prerequisites?.length || s.prerequisites.every((p) => !idSet.has(p)),
  );
  if (tier0.length) {
    tiers.push(tier0.sort((a, b) => a.sortOrder - b.sortOrder));
    tier0.forEach((s) => placed.add(s.id));
  }

  let safety = 10;
  while (placed.size < skills.length && safety-- > 0) {
    const next = skills.filter(
      (s) =>
        !placed.has(s.id) && (s.prerequisites || []).every((p) => placed.has(p) || !idSet.has(p)),
    );
    if (!next.length) break;
    tiers.push(next.sort((a, b) => a.sortOrder - b.sortOrder));
    next.forEach((s) => placed.add(s.id));
  }

  const remaining = skills.filter((s) => !placed.has(s.id));
  if (remaining.length) tiers.push(remaining);

  return tiers;
}

export default function SkillTreePage() {
  usePageBackground(PAGE_BG.SKILL_TREE);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const gold = usePlayerStore((s) => s.gold);
  const [templates, setTemplates] = useState<SkillTemplateData[]>([]);
  const [playerSkills, setPlayerSkills] = useState<PlayerSkillData[]>([]);
  const [branch, setBranch] = useState<Branch>('COMBAT');
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([fetchSkillTemplates(), fetchPlayerSkills()]);
      setTemplates(tRes.templates || []);
      setPlayerSkills(sRes.skills || []);
    } catch {
      /* noop */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const skillMap = useMemo(() => {
    const m = new Map<string, PlayerSkillData>();
    playerSkills.forEach((s) => m.set(s.skillTemplateId, s));
    return m;
  }, [playerSkills]);

  const branchSkills = useMemo(
    () => templates.filter((t) => (t.branch || '').toUpperCase() === branch),
    [templates, branch],
  );

  const tiers = useMemo(() => buildTiers(branchSkills), [branchSkills]);

  const canUnlock = useCallback(
    (t: SkillTemplateData): boolean => {
      if (!t.prerequisites?.length) return true;
      return t.prerequisites.every((preId) => skillMap.get(preId)?.unlocked);
    },
    [skillMap],
  );

  const syncCurrency = useCallback(async () => {
    try {
      const c = await fetchPlayerCurrency();
      usePlayerStore.getState().setCurrency(c.gold, c.diamond);
    } catch {
      /* noop */
    }
  }, []);

  const handleUnlock = useCallback(
    async (templateId: string) => {
      setOperating(true);
      try {
        await unlockSkill(templateId);
        await Promise.all([loadData(), syncCurrency()]);
        toast.reward('技能习得！');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '学习失败');
      }
      setOperating(false);
    },
    [loadData, syncCurrency],
  );

  const handleUpgrade = useCallback(
    async (templateId: string) => {
      setOperating(true);
      try {
        await upgradeSkill(templateId);
        await Promise.all([loadData(), syncCurrency()]);
        toast.info('技能升级！');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '升级失败');
      }
      setOperating(false);
    },
    [loadData, syncCurrency],
  );

  const selected = selectedId ? templates.find((t) => t.id === selectedId) || null : null;
  const selectedPs = selected ? skillMap.get(selected.id) : null;

  const unlockedCount = branchSkills.filter((t) => skillMap.get(t.id)?.unlocked).length;
  const branchIcon = BRANCHES.find((b) => b.key === branch)?.icon || '术';

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>修 习</span>
            <span className={styles.appbarZone}>三 道 心 法 · 一 念 通 玄</span>
          </div>
          <div className={styles.appbarIcons}>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => navigateTo('character')}
              aria-label="返回"
            >
              回
            </button>
          </div>
        </div>
      </div>

      <div className={styles.stTopBar}>
        <span className={styles.stGold}>金 {gold.toLocaleString()}</span>
        <span className={styles.appbarZone}>
          {BRANCHES.find((b) => b.key === branch)?.label} · {unlockedCount} / {branchSkills.length}
        </span>
      </div>

      <div className={styles.stTabs}>
        {BRANCHES.map((b) => (
          <button
            key={b.key}
            type="button"
            className={`${styles.stTab} ${branch === b.key ? styles.stTabOn : ''}`.trim()}
            onClick={() => {
              setBranch(b.key);
              setSelectedId(null);
            }}
          >
            {b.icon} · {b.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.dgLoading}>修习心法载入中 ...</div>
      ) : tiers.length > 0 ? (
        <div className={styles.stTree}>
          {tiers.map((tier, tierIdx) => {
            const tierUnlocked = tier.some((t) => skillMap.get(t.id)?.unlocked);
            return (
              <Fragment key={tierIdx}>
                {tierIdx > 0 && (
                  <div className={styles.stTier}>
                    <div
                      className={`${styles.stTierConn} ${tierUnlocked ? styles.stTierConnOn : ''}`.trim()}
                    />
                  </div>
                )}
                <div className={styles.stTierRow}>
                  {tier.map((t) => {
                    const ps = skillMap.get(t.id);
                    const unlocked = ps?.unlocked ?? false;
                    const level = ps?.level ?? 0;
                    const maxed = level >= t.maxLevel;
                    const prereqMet = canUnlock(t);

                    const circleCls = maxed
                      ? styles.stCircleMax
                      : unlocked
                        ? styles.stCircleOn
                        : prereqMet
                          ? styles.stCircleAvail
                          : styles.stCircleLocked;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={styles.stNode}
                        onClick={() => setSelectedId(t.id)}
                      >
                        <span className={`${styles.stCircle} ${circleCls}`}>
                          {t.icon || branchIcon}
                          {unlocked && (
                            <span
                              className={`${styles.stLvBadge} ${maxed ? styles.stLvBadgeMax : ''}`.trim()}
                            >
                              {level}
                            </span>
                          )}
                        </span>
                        <span
                          className={`${styles.stNodeName} ${unlocked ? styles.stNodeNameOn : ''}`.trim()}
                        >
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Fragment>
            );
          })}
        </div>
      ) : (
        <div className={styles.stTreeEmpty}>
          <span className={styles.stTreeEmptyIcon}>木</span>
          暂 无 可 用 心 法
        </div>
      )}

      {selected && (
        <div className={styles.stOverlay} onClick={() => setSelectedId(null)}>
          <div className={styles.stCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.stCardHead}>
              <div className={styles.stCardIcon}>{selected.icon || branchIcon}</div>
              <div>
                <div className={styles.stCardName}>{selected.name}</div>
                <div className={styles.stCardMeta}>
                  {selected.type === 'ACTIVE' ? '主动' : '被动'} · Lv.{selectedPs?.level ?? 0} /{' '}
                  {selected.maxLevel}
                </div>
              </div>
            </div>

            <div className={styles.stCardDesc}>{selected.description || '暂无描述'}</div>

            {(() => {
              const eff = parseEffect(selected.effectJson);
              if (!eff) return null;
              const tags: { text: string; hl?: boolean }[] = [];
              if (eff.mpCost) tags.push({ text: `消耗 ${String(eff.mpCost)} MP` });
              if (eff.multiplier)
                tags.push({ text: `${String(eff.multiplier)}x 倍率`, hl: true });
              if (eff.effectType)
                tags.push({
                  text: EFFECT_LABELS[String(eff.effectType)] || String(eff.effectType),
                });
              if (eff.defenseBonus)
                tags.push({ text: `+${Number(eff.defenseBonus) * 100}% 物防` });
              if (eff.magicDefenseBonus)
                tags.push({ text: `+${Number(eff.magicDefenseBonus) * 100}% 魔防` });
              if (eff.fateBonus) tags.push({ text: `+${Number(eff.fateBonus) * 100}% 缘分` });
              if (eff.exploreBonus)
                tags.push({ text: `+${Number(eff.exploreBonus) * 100}% 探索` });
              if (eff.rebirthExpBonus)
                tags.push({
                  text: `+${Number(eff.rebirthExpBonus) * 100}% 轮回经验`,
                  hl: true,
                });
              if (eff.rebirthGoldRetain)
                tags.push({ text: `保留 ${Number(eff.rebirthGoldRetain) * 100}% 金币` });
              if (eff.statBonusPerRebirth)
                tags.push({
                  text: `+${Number(eff.statBonusPerRebirth) * 100}% / 世 属性`,
                  hl: true,
                });
              if (eff.lifesteal) tags.push({ text: '吸血' });
              if (eff.freeze) tags.push({ text: '冰冻' });
              if (eff.dialogueExtra) tags.push({ text: '额外对话' });
              if (eff.revealOutcome) tags.push({ text: '预知结果' });
              if (eff.dejaVuChance)
                tags.push({ text: `${Number(eff.dejaVuChance) * 100}% 触发率` });
              if (eff.inheritPassive) tags.push({ text: '继承被动' });
              if (eff.companionBonus)
                tags.push({ text: `+${Number(eff.companionBonus) * 100}% 羁绊` });
              if (eff.atkBonus) tags.push({ text: `+${Number(eff.atkBonus) * 100}% 攻击` });
              if (!tags.length) return null;
              return (
                <div className={styles.stTags}>
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      className={`${styles.stTag} ${t.hl ? styles.stTagHL : ''}`.trim()}
                    >
                      {t.text}
                    </span>
                  ))}
                </div>
              );
            })()}

            {selected.costPerLevel > 0 && (
              <div
                className={`${styles.stCost} ${gold < selected.costPerLevel ? styles.stCostNo : ''}`.trim()}
              >
                {selectedPs?.unlocked ? '升级' : '学习'} 消耗 · 金 {selected.costPerLevel}
              </div>
            )}

            {selected.prerequisites?.length ? (
              <div className={styles.stPrereq}>
                前 置 ·{' '}
                {selected.prerequisites
                  .map((p) => templates.find((t) => t.id === p)?.name || p)
                  .join('、')}
              </div>
            ) : null}

            <div className={styles.stCardActs}>
              <button
                type="button"
                className={`${styles.stBtn} ${styles.stBtnGhost}`}
                onClick={() => setSelectedId(null)}
              >
                关 闭
              </button>
              {!selectedPs?.unlocked && canUnlock(selected) && (
                <button
                  type="button"
                  className={`${styles.stBtn} ${styles.stBtnPrim}`}
                  disabled={operating || gold < selected.costPerLevel}
                  onClick={() => handleUnlock(selected.id)}
                >
                  {operating ? '...' : '学 习'}
                </button>
              )}
              {selectedPs?.unlocked && (selectedPs?.level ?? 0) < selected.maxLevel && (
                <button
                  type="button"
                  className={`${styles.stBtn} ${styles.stBtnPrim}`}
                  disabled={operating}
                  onClick={() => handleUpgrade(selected.id)}
                >
                  {operating ? '...' : '升 级'}
                </button>
              )}
              {!selectedPs?.unlocked && !canUnlock(selected) && (
                <button type="button" className={`${styles.stBtn} ${styles.stBtnPrim}`} disabled>
                  需 解 锁 前 置
                </button>
              )}
              {selectedPs?.unlocked && (selectedPs?.level ?? 0) >= selected.maxLevel && (
                <button type="button" className={`${styles.stBtn} ${styles.stBtnPrim}`} disabled>
                  已 满 级
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
