import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  fetchSkillTemplates, fetchPlayerSkills, unlockSkill, upgradeSkill,
  type SkillTemplateData, type PlayerSkillData,
} from '../../services/api';
import styles from './PageSkeleton.module.css';

type Branch = 'EMOTION' | 'COMBAT';

const BRANCH_META: Record<Branch, { label: string; icon: string }> = {
  EMOTION: { label: '情感系', icon: '💫' },
  COMBAT: { label: '战斗系', icon: '⚔️' },
};

export default function SkillTreePage() {
  const [templates, setTemplates] = useState<SkillTemplateData[]>([]);
  const [playerSkills, setPlayerSkills] = useState<PlayerSkillData[]>([]);
  const [branch, setBranch] = useState<Branch>('EMOTION');
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState<string | null>(null);
  const [selected, setSelected] = useState<SkillTemplateData | null>(null);

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
    templates
      .filter(t => (t.branch || '').toUpperCase() === branch)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [templates, branch],
  );

  const canUnlock = useCallback((t: SkillTemplateData): boolean => {
    if (!t.prerequisites?.length) return true;
    return t.prerequisites.every(preId => {
      const ps = skillMap.get(preId);
      return ps?.unlocked;
    });
  }, [skillMap]);

  const handleUnlock = useCallback(async (templateId: string) => {
    setOperating(templateId);
    try {
      await unlockSkill(templateId);
      await loadData();
    } catch { /* noop */ }
    setOperating(null);
  }, [loadData]);

  const handleUpgrade = useCallback(async (templateId: string) => {
    setOperating(templateId);
    try {
      await upgradeSkill(templateId);
      await loadData();
    } catch { /* noop */ }
    setOperating(null);
  }, [loadData]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>技能树</h2>
        <p className={styles.subtitle}>七世轮回，逐步觉醒</p>
      </div>

      <div className={styles.tabRow}>
        {(['EMOTION', 'COMBAT'] as Branch[]).map(b => (
          <button
            key={b}
            className={`${styles.tab} ${branch === b ? styles.tabActive : ''}`}
            onClick={() => { setBranch(b); setSelected(null); }}
          >
            {BRANCH_META[b].icon} {BRANCH_META[b].label}
          </button>
        ))}
      </div>

      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : branchSkills.length > 0 ? (
          <div className={styles.cardList}>
            {branchSkills.map(t => {
              const ps = skillMap.get(t.id);
              const unlocked = ps?.unlocked ?? false;
              const level = ps?.level ?? 0;
              const maxed = level >= t.maxLevel;
              const prereqMet = canUnlock(t);
              const isSelected = selected?.id === t.id;

              return (
                <button
                  key={t.id}
                  className={styles.card}
                  style={{
                    borderColor: isSelected ? 'var(--gold)' : undefined,
                    opacity: !unlocked && !prereqMet ? 0.4 : 1,
                  }}
                  onClick={() => setSelected(isSelected ? null : t)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{t.icon || BRANCH_META[branch].icon}</span>
                    <div style={{ flex: 1 }}>
                      <p className={styles.cardTitle}>{t.name}</p>
                      <p className={styles.cardMeta}>
                        {t.type === 'ACTIVE' ? '主动' : '被动'}
                        {' · '}Lv.{level}/{t.maxLevel}
                        {t.requiredLevel > 0 && ` · 需要等级${t.requiredLevel}`}
                      </p>
                    </div>
                    {unlocked && (
                      <span style={{
                        fontSize: '11px', padding: '2px 8px',
                        background: maxed ? 'rgba(76,175,80,0.15)' : 'rgba(201,168,76,0.15)',
                        borderRadius: '999px',
                        color: maxed ? 'var(--green)' : 'var(--gold-dim)',
                        fontWeight: 600,
                      }}>
                        {maxed ? '满级' : `Lv.${level}`}
                      </span>
                    )}
                    {!unlocked && prereqMet && (
                      <span style={{
                        fontSize: '11px', padding: '2px 8px',
                        background: 'rgba(201,168,76,0.1)', borderRadius: '999px',
                        color: 'var(--gold-dim)',
                      }}>
                        可学习
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--paper-darker)' }}>
                      <p style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.7, lineHeight: 1.6 }}>
                        {t.description || '暂无描述'}
                      </p>
                      {t.costPerLevel > 0 && (
                        <p style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.5, marginTop: '4px' }}>
                          每级消耗：{t.costPerLevel} 技能点
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        {!unlocked && prereqMet && (
                          <button
                            className={styles.actionBtn}
                            style={{ marginTop: 0, fontSize: '12px', padding: '6px 16px' }}
                            disabled={operating === t.id}
                            onClick={(e) => { e.stopPropagation(); handleUnlock(t.id); }}
                          >
                            {operating === t.id ? '...' : '学习'}
                          </button>
                        )}
                        {unlocked && !maxed && (
                          <button
                            className={styles.actionBtn}
                            style={{ marginTop: 0, fontSize: '12px', padding: '6px 16px' }}
                            disabled={operating === t.id}
                            onClick={(e) => { e.stopPropagation(); handleUpgrade(t.id); }}
                          >
                            {operating === t.id ? '...' : '升级'}
                          </button>
                        )}
                        {!unlocked && !prereqMet && (
                          <span style={{ fontSize: '12px', color: 'var(--ink)', opacity: 0.4 }}>
                            需先解锁前置技能
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>🌳</span>
            <p>技能通过轮回积累解锁</p>
            <p className={styles.hint}>暂无可用技能模板</p>
          </div>
        )}
      </div>
    </div>
  );
}
