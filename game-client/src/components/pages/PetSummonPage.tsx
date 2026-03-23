import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { fetchPetTemplates, randomPet, createPet, type PetTemplateData, type PetData } from '../../services/api';
import styles from './PageSkeleton.module.css';

type Phase = 'choose' | 'summoning' | 'result';

export default function PetSummonPage() {
  const { navigateTo } = useGameStore();
  const [templates, setTemplates] = useState<PetTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [phase, setPhase] = useState<Phase>('choose');
  const [result, setResult] = useState<PetData | null>(null);

  useEffect(() => {
    fetchPetTemplates()
      .then((res) => setTemplates(res.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRandomSummon = useCallback(async () => {
    setPhase('summoning');
    try {
      const res = await randomPet();
      setResult(res.pet);
      setPhase('result');
    } catch {
      setPhase('choose');
    }
  }, []);

  const handleCreateSummon = useCallback(async () => {
    if (!selectedTemplate) return;
    setPhase('summoning');
    try {
      const res = await createPet({
        petTemplateId: selectedTemplate,
        nickname: nickname || undefined,
      });
      setResult(res.pet);
      setPhase('result');
    } catch {
      setPhase('choose');
    }
  }, [selectedTemplate, nickname]);

  const handleReset = () => {
    setPhase('choose');
    setResult(null);
    setSelectedTemplate(null);
    setNickname('');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>宠物召唤</h2>
        <p className={styles.subtitle}>以灵力凝聚，唤醒沉睡之魂</p>
      </div>
      <div className={styles.scrollArea}>
        {phase === 'choose' && (
          <>
            {/* 随机召唤 */}
            <div className={styles.summonCircle}>
              <div className={styles.summonRing}>
                <span className={styles.placeholderIcon}>🥚</span>
              </div>
              <button className={styles.primaryBtn} style={{ width: 'auto', padding: '12px 32px' }} onClick={handleRandomSummon}>
                随机孵蛋
              </button>
              <p className={styles.hint}>消耗宠物蛋，随机获得一只宠物</p>
            </div>

            {/* 指定模板召唤 */}
            {!loading && templates.length > 0 && (
              <section className={styles.section} style={{ marginTop: '24px' }}>
                <h3 className={styles.sectionTitle}>指定召唤</h3>
                <div className={styles.cardList}>
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      className={styles.card}
                      style={selectedTemplate === t.id ? { borderColor: 'var(--gold)' } : undefined}
                      onClick={() => setSelectedTemplate(t.id === selectedTemplate ? null : t.id)}
                    >
                      <p className={styles.cardTitle}>{t.name}</p>
                      {t.description && <p className={styles.cardDesc}>{t.description}</p>}
                    </button>
                  ))}
                </div>

                {selectedTemplate && (
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="text"
                      placeholder="为宠物取个名字（可选）"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={12}
                      style={{
                        width: '100%', padding: '10px 12px', background: 'var(--paper-dark)',
                        border: '1px solid var(--paper-darker)', borderRadius: 'var(--radius-md)',
                        color: 'var(--ink)', fontSize: '14px', fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button className={styles.primaryBtn} onClick={handleCreateSummon}>
                      召唤
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {phase === 'summoning' && (
          <div className={styles.summonCircle}>
            <div className={styles.summonRing} style={{ borderColor: 'var(--gold)', animation: 'pulse 0.8s infinite' }}>
              <span className={styles.placeholderIcon}>✨</span>
            </div>
            <p style={{ color: 'var(--ink)', opacity: 0.6, marginTop: '8px' }}>灵力凝聚中...</p>
          </div>
        )}

        {phase === 'result' && result && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🐾</div>
            <h3 style={{ fontSize: '20px', color: 'var(--gold)', fontFamily: 'var(--font-main)', marginBottom: '8px' }}>
              {result.nickname || result.petTemplateId}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink)', opacity: 0.6, marginBottom: '16px' }}>
              {result.petType && `${result.petType} · `}{result.element || '无属性'}
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px', padding: '16px', background: 'var(--paper-dark)',
              borderRadius: 'var(--radius-md)', marginBottom: '24px',
            }}>
              {([
                ['体质', result.constitution],
                ['魔力', result.magicPower],
                ['力量', result.power],
                ['耐力', result.endurance],
                ['敏捷', result.agile],
              ] as const).map(([label, val]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink)', opacity: 0.5 }}>{label}</div>
                  <div style={{ fontSize: '16px', color: 'var(--gold-dim)', fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className={styles.actionBtn} onClick={handleReset}>
                继续召唤
              </button>
              <button className={styles.actionBtn} style={{ background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)' }}
                onClick={() => navigateTo('pet')}>
                查看宠物
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
