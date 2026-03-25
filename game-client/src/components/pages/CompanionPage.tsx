import React, { useEffect, useState, useCallback } from 'react';
import { toast } from '../../store/toastStore';
import {
  fetchCompanions, feedCompanion, setCompanionActive, fetchCompanionSkills,
  type CompanionData,
} from '../../services/api';
import { QUALITY_COLOR_MAP, QUALITY_LABELS } from '../../constants/quality';
import page from '../../styles/page.module.css';
import own from './CompanionPage.module.css';

const styles = { ...page, ...own };

interface SkillInfo {
  name: string;
  description: string;
  level: number;
  icon: string;
}

export default function CompanionPage() {
  const [companions, setCompanions] = useState<CompanionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CompanionData | null>(null);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [skillLoading, setSkillLoading] = useState(false);
  const [feeding, setFeeding] = useState(false);
  const [activating, setActivating] = useState(false);

  const loadCompanions = useCallback(async () => {
    try {
      const res = await fetchCompanions();
      setCompanions(res.companions || []);
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadCompanions(); }, [loadCompanions]);

  const handleSelect = useCallback(async (c: CompanionData) => {
    if (selected?.id === c.id) {
      setSelected(null);
      setSkills([]);
      return;
    }
    setSelected(c);
    setSkillLoading(true);
    try {
      const res = await fetchCompanionSkills(c.id);
      setSkills(res.skills || []);
    } catch {
      setSkills([]);
    }
    setSkillLoading(false);
  }, [selected]);

  const handleFeed = useCallback(async () => {
    if (!selected || feeding) return;
    setFeeding(true);
    try {
      const updated = await feedCompanion(selected.id);
      setSelected(updated);
      setCompanions((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(`${selected.name} 好感度提升！`);
    } catch {
      toast.error('培养失败，资源不足');
    }
    setFeeding(false);
  }, [selected, feeding]);

  const handleSetActive = useCallback(async () => {
    if (!selected || activating) return;
    setActivating(true);
    try {
      await setCompanionActive(selected.id);
      toast.success(`${selected.name} 已设为出战灵侣`);
    } catch {
      toast.error('设置失败');
    }
    setActivating(false);
  }, [selected, activating]);

  const hpPct = selected ? Math.min(100, (selected.currentHp / Math.max(1, selected.maxHp)) * 100) : 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>灵侣</h2>
        <p className={styles.subtitle}>{companions.length} 位灵侣相伴</p>
      </div>

      <div className={styles.body}>
        {/* 灵侣列表 */}
        <div className={styles.listArea}>
          {loading ? (
            <div className={styles.empty}><p>加载中...</p></div>
          ) : companions.length > 0 ? (
            <div className={styles.companionList}>
              {companions.map((c) => (
                <button
                  key={c.id}
                  className={`${styles.companionCard} ${selected?.id === c.id ? styles.cardSelected : ''}`}
                  onClick={() => handleSelect(c)}
                >
                  <div className={styles.companionAvatar} style={{ borderColor: QUALITY_COLOR_MAP[c.quality] || 'var(--paper-darker)' }}>
                    <span className={styles.avatarText}>{c.name.charAt(0)}</span>
                    <span className={styles.levelBadge}>Lv.{c.level}</span>
                  </div>
                  <div className={styles.companionBrief}>
                    <span className={styles.companionName} style={{ color: QUALITY_COLOR_MAP[c.quality] || 'var(--ink)' }}>
                      {c.name}
                    </span>
                    <span className={styles.companionMeta}>
                      {QUALITY_LABELS[c.quality] || c.quality} · {c.realm}
                    </span>
                    {c.bondLevel > 0 && (
                      <span className={styles.bondBadge}>羁绊 {c.bondLevel}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.placeholderIcon}>💞</span>
              <p>尚无灵侣</p>
              <p className={styles.hint}>通过探索和副本获得灵侣</p>
            </div>
          )}
        </div>

        {/* 灵侣详情面板 */}
        {selected && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h3 className={styles.detailName} style={{ color: QUALITY_COLOR_MAP[selected.quality] || 'var(--ink)' }}>
                {selected.name}
              </h3>
              <span className={styles.detailType}>{selected.type} · {selected.realm}</span>
            </div>

            {/* HP条 */}
            <div className={styles.hpSection}>
              <div className={styles.hpLabel}>
                <span>生命</span>
                <span>{selected.currentHp}/{selected.maxHp}</span>
              </div>
              <div className={styles.hpTrack}>
                <div className={styles.hpFill} style={{ width: `${hpPct}%` }} />
              </div>
            </div>

            {/* 属性面板 */}
            <div className={styles.statsGrid}>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>攻击</span>
                <span className={styles.statValue}>{selected.atk}</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>防御</span>
                <span className={styles.statValue}>{selected.def}</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>速度</span>
                <span className={styles.statValue}>{selected.spd}</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>羁绊</span>
                <span className={styles.statValue}>{selected.bondLevel}</span>
              </div>
            </div>

            {/* 技能 */}
            <div className={styles.skillSection}>
              <h4 className={styles.skillTitle}>灵侣技能</h4>
              {skillLoading ? (
                <p className={styles.skillLoading}>加载中...</p>
              ) : skills.length > 0 ? (
                <div className={styles.skillList}>
                  {skills.map((sk, i) => (
                    <div key={i} className={styles.skillItem}>
                      <span className={styles.skillIcon}>{sk.icon || '◆'}</span>
                      <div className={styles.skillInfo}>
                        <span className={styles.skillName}>{sk.name} Lv.{sk.level}</span>
                        <span className={styles.skillDesc}>{sk.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.skillEmpty}>暂未领悟技能</p>
              )}
            </div>

            {/* 操作按钮 */}
            <div className={styles.actionRow}>
              <button
                className={styles.feedBtn}
                onClick={handleFeed}
                disabled={feeding}
              >
                {feeding ? '培养中...' : '培养 (消耗金币)'}
              </button>
              <button
                className={styles.activeBtn}
                onClick={handleSetActive}
                disabled={activating}
              >
                {activating ? '设置中...' : '设为出战'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
