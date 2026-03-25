import { useEffect, useState, useCallback, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import {
  fetchSkillTemplates, fetchPlayerSkills, unlockSkill, upgradeSkill, fetchPlayerCurrency,
  type SkillTemplateData, type PlayerSkillData,
} from '../../services/api';
import styles from './SkillTreePage.module.css';

type Branch = 'COMBAT' | 'EMOTION' | 'REBIRTH';

const BRANCH_META: Record<Branch, { label: string; icon: string; desc: string }> = {
  COMBAT: { label: '战斗', icon: '⚔️', desc: '提升战斗能力' },
  EMOTION: { label: '情感', icon: '💫', desc: '增强社交与探索' },
  REBIRTH: { label: '轮回', icon: '☯️', desc: '跨世传承加成' },
};

const EFFECT_LABELS: Record<string, string> = {
  physical_damage: '物理伤害',
  magic_damage: '魔法伤害',
  heal: '治疗',
  buff_defense: '防御增益',
};

function parseEffect(json?: string): Record<string, unknown> | null {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

/** 按前置关系分层 */
function buildTiers(skills: SkillTemplateData[]): SkillTemplateData[][] {
  const idSet = new Set(skills.map(s => s.id));
  const tiers: SkillTemplateData[][] = [];
  const placed = new Set<string>();

  // 第一层：无前置 或 前置不在当前分支内
  const tier0 = skills.filter(s =>
    !s.prerequisites?.length || s.prerequisites.every(p => !idSet.has(p))
  );
  if (tier0.length) {
    tiers.push(tier0.sort((a, b) => a.sortOrder - b.sortOrder));
    tier0.forEach(s => placed.add(s.id));
  }

  // 后续层：前置已在之前层中
  let safety = 10;
  while (placed.size < skills.length && safety-- > 0) {
    const next = skills.filter(s =>
      !placed.has(s.id) && (s.prerequisites || []).every(p => placed.has(p) || !idSet.has(p))
    );
    if (!next.length) break;
    tiers.push(next.sort((a, b) => a.sortOrder - b.sortOrder));
    next.forEach(s => placed.add(s.id));
  }

  // 剩余未放置的放最后
  const remaining = skills.filter(s => !placed.has(s.id));
  if (remaining.length) tiers.push(remaining);

  return tiers;
}

export default function SkillTreePage() {
  const { navigateTo } = useGameStore();
  const { gold } = usePlayerStore();
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
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const skillMap = useMemo(() => {
    const m = new Map<string, PlayerSkillData>();
    playerSkills.forEach(s => m.set(s.skillTemplateId, s));
    return m;
  }, [playerSkills]);

  const branchSkills = useMemo(() =>
    templates.filter(t => (t.branch || '').toUpperCase() === branch),
    [templates, branch],
  );

  const tiers = useMemo(() => buildTiers(branchSkills), [branchSkills]);

  const canUnlock = useCallback((t: SkillTemplateData): boolean => {
    if (!t.prerequisites?.length) return true;
    return t.prerequisites.every(preId => skillMap.get(preId)?.unlocked);
  }, [skillMap]);

  const syncCurrency = useCallback(async () => {
    try {
      const c = await fetchPlayerCurrency();
      usePlayerStore.getState().setCurrency(c.gold, c.diamond);
    } catch { /* noop */ }
  }, []);

  const handleUnlock = useCallback(async (templateId: string) => {
    setOperating(true);
    try {
      await unlockSkill(templateId);
      await Promise.all([loadData(), syncCurrency()]);
      toast.reward('技能习得！');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '学习失败');
    }
    setOperating(false);
  }, [loadData, syncCurrency]);

  const handleUpgrade = useCallback(async (templateId: string) => {
    setOperating(true);
    try {
      await upgradeSkill(templateId);
      await Promise.all([loadData(), syncCurrency()]);
      toast.info('技能升级！');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '升级失败');
    }
    setOperating(false);
  }, [loadData, syncCurrency]);

  const selected = selectedId ? templates.find(t => t.id === selectedId) : null;
  const selectedPs = selected ? skillMap.get(selected.id) : null;

  // 统计已解锁数
  const unlockedCount = branchSkills.filter(t => skillMap.get(t.id)?.unlocked).length;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigateTo('character')}>← 返回</button>
        <span className={styles.pageTitle}>技能树</span>
        <span className={styles.goldBadge}>💰 {gold}</span>
      </div>

      {/* 分支标签 */}
      <div className={styles.branchTabs}>
        {(['COMBAT', 'EMOTION', 'REBIRTH'] as Branch[]).map(b => (
          <button
            key={b}
            className={`${styles.branchTab} ${branch === b ? styles.branchTabActive : ''}`}
            onClick={() => { setBranch(b); setSelectedId(null); }}
          >
            {BRANCH_META[b].icon} {BRANCH_META[b].label}
            {branch === b && ` (${unlockedCount}/${branchSkills.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : tiers.length > 0 ? (
        <div className={styles.treeArea}>
          <div className={styles.skillTree}>
            {tiers.map((tier, tierIdx) => (
              <div key={tierIdx}>
                {/* 连接线 */}
                {tierIdx > 0 && (
                  <div className={styles.tierConnector}>
                    <div className={`${styles.connectorLine} ${
                      tier.some(t => skillMap.get(t.id)?.unlocked) ? styles.connectorLineActive : ''
                    }`} />
                  </div>
                )}

                {/* 当前层节点 */}
                <div className={styles.tierRow}>
                  {tier.map(t => {
                    const ps = skillMap.get(t.id);
                    const unlocked = ps?.unlocked ?? false;
                    const level = ps?.level ?? 0;
                    const maxed = level >= t.maxLevel;
                    const prereqMet = canUnlock(t);

                    const circleClass = [
                      styles.skillCircle,
                      maxed ? styles.skillCircleMaxed :
                      unlocked ? styles.skillCircleUnlocked :
                      prereqMet ? styles.skillCircleAvailable :
                      styles.skillCircleLocked,
                    ].join(' ');

                    return (
                      <div
                        key={t.id}
                        className={styles.skillNode}
                        onClick={() => setSelectedId(t.id)}
                      >
                        <div className={circleClass}>
                          {t.icon || BRANCH_META[branch].icon}
                          {unlocked && (
                            <span className={`${styles.levelBadge} ${maxed ? styles.levelBadgeMaxed : styles.levelBadgeUnlocked}`}>
                              {level}
                            </span>
                          )}
                        </div>
                        <span className={`${styles.skillName} ${unlocked ? styles.skillNameUnlocked : ''}`}>
                          {t.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🌳</span>
          <p>暂无可用技能</p>
        </div>
      )}

      {/* 技能详情弹窗 */}
      {selected && (
        <div className={styles.detailOverlay} onClick={() => setSelectedId(null)}>
          <div className={styles.detailCard} onClick={e => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <div className={styles.detailIcon}>{selected.icon || '✨'}</div>
              <div className={styles.detailInfo}>
                <div className={styles.detailName}>{selected.name}</div>
                <div className={styles.detailMeta}>
                  {selected.type === 'ACTIVE' ? '主动技能' : '被动技能'}
                  {' · '}Lv.{selectedPs?.level ?? 0}/{selected.maxLevel}
                </div>
              </div>
            </div>

            <div className={styles.detailDesc}>{selected.description || '暂无描述'}</div>

            {/* 效果标签 */}
            {(() => {
              const eff = parseEffect(selected.effectJson);
              if (!eff) return null;
              return (
                <div className={styles.detailStats}>
                  {eff.mpCost ? <span className={styles.statTag}>消耗 {String(eff.mpCost)} MP</span> : null}
                  {eff.multiplier ? <span className={`${styles.statTag} ${styles.statTagHighlight}`}>{String(eff.multiplier)}x 倍率</span> : null}
                  {eff.effectType ? <span className={styles.statTag}>{EFFECT_LABELS[String(eff.effectType)] || String(eff.effectType)}</span> : null}
                  {eff.defenseBonus ? <span className={styles.statTag}>+{Number(eff.defenseBonus) * 100}% 物防</span> : null}
                  {eff.magicDefenseBonus ? <span className={styles.statTag}>+{Number(eff.magicDefenseBonus) * 100}% 魔防</span> : null}
                  {eff.fateBonus ? <span className={styles.statTag}>+{Number(eff.fateBonus) * 100}% 缘分</span> : null}
                  {eff.exploreBonus ? <span className={styles.statTag}>+{Number(eff.exploreBonus) * 100}% 探索</span> : null}
                  {eff.rebirthExpBonus ? <span className={`${styles.statTag} ${styles.statTagHighlight}`}>+{Number(eff.rebirthExpBonus) * 100}% 轮回经验</span> : null}
                  {eff.rebirthGoldRetain ? <span className={styles.statTag}>保留 {Number(eff.rebirthGoldRetain) * 100}% 金币</span> : null}
                  {eff.statBonusPerRebirth ? <span className={`${styles.statTag} ${styles.statTagHighlight}`}>+{Number(eff.statBonusPerRebirth) * 100}%/世 属性</span> : null}
                  {eff.lifesteal ? <span className={styles.statTag}>吸血</span> : null}
                  {eff.freeze ? <span className={styles.statTag}>冰冻</span> : null}
                  {eff.dialogueExtra ? <span className={styles.statTag}>额外选项</span> : null}
                  {eff.revealOutcome ? <span className={styles.statTag}>预知结果</span> : null}
                  {eff.dejaVuChance ? <span className={styles.statTag}>{Number(eff.dejaVuChance) * 100}% 触发率</span> : null}
                  {eff.inheritPassive ? <span className={styles.statTag}>继承被动</span> : null}
                  {eff.companionBonus ? <span className={styles.statTag}>+{Number(eff.companionBonus) * 100}% 羁绊</span> : null}
                  {eff.atkBonus ? <span className={styles.statTag}>+{Number(eff.atkBonus) * 100}% 攻击</span> : null}
                </div>
              );
            })()}

            {/* 消耗 */}
            {selected.costPerLevel > 0 && (
              <div className={`${styles.detailCost} ${gold >= selected.costPerLevel ? styles.costAfford : styles.costCantAfford}`}>
                💰 {selectedPs?.unlocked ? '升级' : '学习'}消耗：{selected.costPerLevel} 金币
              </div>
            )}

            {/* 前置提示 */}
            {selected.prerequisites?.length ? (
              <div style={{ fontSize: 12, color: 'var(--paper-darker)', marginBottom: 12 }}>
                前置：{selected.prerequisites.map(p => templates.find(t => t.id === p)?.name || p).join('、')}
              </div>
            ) : null}

            {/* 操作 */}
            <div className={styles.detailActions}>
              {!selectedPs?.unlocked && canUnlock(selected) && (
                <button
                  className={styles.unlockBtn}
                  disabled={operating || gold < selected.costPerLevel}
                  onClick={() => handleUnlock(selected.id)}
                >
                  {operating ? '...' : `学习 (${selected.costPerLevel}💰)`}
                </button>
              )}
              {selectedPs?.unlocked && (selectedPs?.level ?? 0) < selected.maxLevel && (
                <button
                  className={styles.unlockBtn}
                  disabled={operating}
                  onClick={() => handleUpgrade(selected.id)}
                >
                  {operating ? '...' : '升级'}
                </button>
              )}
              {!selectedPs?.unlocked && !canUnlock(selected) && (
                <button className={styles.unlockBtn} disabled>
                  需先解锁前置技能
                </button>
              )}
              {selectedPs?.unlocked && (selectedPs?.level ?? 0) >= selected.maxLevel && (
                <button className={styles.unlockBtn} disabled>
                  已满级
                </button>
              )}
              <button className={styles.closeBtn} onClick={() => setSelectedId(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
