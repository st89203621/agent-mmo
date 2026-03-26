import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { fetchPets, deletePet, type PetData } from '../../services/api';
import styles from './PageSkeleton.module.css';

const ELEMENT_ICONS: Record<string, string> = {
  fire: '🔥', ice: '❄️', thunder: '⚡', wind: '🌪️',
  earth: '🪨', water: '💧', light: '✨', dark: '🌑',
};

const TIER_COLORS: Record<number, string> = {
  1: '#aaa', 2: '#5cb85c', 3: '#3498db', 4: '#a855f7', 5: '#f59e0b', 6: '#ef4444',
};

const STAT_LABELS = [
  { key: 'constitution', label: '体质' },
  { key: 'magicPower', label: '魔力' },
  { key: 'power', label: '力量' },
  { key: 'endurance', label: '耐力' },
  { key: 'agile', label: '敏捷' },
] as const;

export default function PetPage() {
  const { navigateTo } = useGameStore();
  const [pets, setPets] = useState<PetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PetData | null>(null);
  const [operating, setOperating] = useState(false);

  const loadPets = useCallback(() => {
    setLoading(true);
    fetchPets()
      .then((res) => setPets(res.pets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPets(); }, [loadPets]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    setOperating(true);
    try {
      await deletePet(selected.id);
      setSelected(null);
      loadPets();
    } catch { /* noop */ }
    setOperating(false);
  }, [selected, loadPets]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>宠物</h2>
        <p className={styles.subtitle}>{pets.length} 只宠物</p>
      </div>
      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : pets.length > 0 ? (
          <>
            <div className={styles.cardList}>
              {pets.map((pet) => {
                const tc = TIER_COLORS[pet.tier] || TIER_COLORS[1];
                return (
                <button
                  key={pet.id}
                  className={styles.card}
                  style={selected?.id === pet.id
                    ? { borderColor: 'var(--gold)' }
                    : pet.tier >= 4 ? { borderColor: `${tc}60` } : undefined}
                  onClick={() => setSelected(pet.id === selected?.id ? null : pet)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px' }}>
                      {pet.icon || ELEMENT_ICONS[pet.element] || '🐾'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p className={styles.cardTitle}>
                        {pet.nickname || pet.petTemplateId}
                      </p>
                      <p className={styles.cardMeta}>
                        {pet.petType && `${pet.petType} · `}
                        {pet.element && `${pet.element} · `}
                        进化 Lv.{pet.mutationNo}
                      </p>
                    </div>
                    {pet.tierName && (
                      <span style={{
                        fontSize: '10px', padding: '2px 8px',
                        background: `${tc}15`, borderRadius: '999px',
                        color: tc, fontWeight: 700,
                        border: `1px solid ${tc}40`,
                      }}>
                        {pet.tierName}
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '4px', marginTop: '8px',
                  }}>
                    {STAT_LABELS.map(({ key, label }) => (
                      <div key={key} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--ink)', opacity: 0.5 }}>{label}</div>
                        <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 600 }}>
                          {pet[key]}
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
                );
              })}
            </div>

            {selected && (
              <div style={{
                marginTop: '12px', padding: '12px', background: 'var(--paper-dark)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--paper-darker)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 600 }}>
                  {selected.nickname || selected.petTemplateId}
                </span>
                <button
                  style={{
                    background: 'none', border: '1px solid var(--red, #c44)',
                    borderRadius: 'var(--radius-md)', padding: '6px 16px',
                    fontSize: '13px', color: 'var(--red, #c44)', cursor: 'pointer',
                  }}
                  disabled={operating}
                  onClick={handleDelete}
                >
                  {operating ? '...' : '放生'}
                </button>
              </div>
            )}

            <button
              className={styles.actionBtn}
              style={{ marginTop: '16px', width: '100%', textAlign: 'center' }}
              onClick={() => navigateTo('pet-summon')}
            >
              召唤新宠物
            </button>
          </>
        ) : (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>🐾</span>
            <p>尚未拥有宠物</p>
            <p className={styles.hint}>使用宠物蛋在召唤页孵化</p>
            <button className={styles.actionBtn} onClick={() => navigateTo('pet-summon')}>
              前往召唤
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
