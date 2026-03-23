import React, { useEffect, useState } from 'react';
import { fetchCompanions, type CompanionData } from '../../services/api';
import styles from './PageSkeleton.module.css';

const QUALITY_COLORS: Record<string, string> = {
  common: 'var(--quality-common, #aaa)',
  uncommon: 'var(--quality-uncommon, #5c5)',
  rare: 'var(--quality-rare, #55f)',
  epic: 'var(--quality-epic, #a5a)',
  legendary: 'var(--quality-legendary, #fa5)',
};

export default function CompanionPage() {
  const [companions, setCompanions] = useState<CompanionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CompanionData | null>(null);

  useEffect(() => {
    fetchCompanions()
      .then(res => setCompanions(res.companions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>灵侣</h2>
        <p className={styles.subtitle}>{companions.length} 位灵侣</p>
      </div>
      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.empty}><p>加载中...</p></div>
        ) : companions.length > 0 ? (
          <div className={styles.cardList}>
            {companions.map(c => (
              <button
                key={c.id}
                className={styles.card}
                style={selected?.id === c.id ? { borderColor: 'var(--gold)' } : undefined}
                onClick={() => setSelected(c.id === selected?.id ? null : c)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>👤</span>
                  <div style={{ flex: 1 }}>
                    <p className={styles.cardTitle} style={{ color: QUALITY_COLORS[c.quality] || 'var(--ink)' }}>
                      {c.name}
                    </p>
                    <p className={styles.cardMeta}>
                      {c.realm} · {c.type} · Lv.{c.level}
                      {c.bondLevel > 0 && ` · 羁绊${c.bondLevel}`}
                    </p>
                  </div>
                </div>

                {selected?.id === c.id && (
                  <div style={{
                    marginTop: '10px', paddingTop: '10px',
                    borderTop: '1px solid var(--paper-darker)',
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
                  }}>
                    {([['HP', `${c.currentHp}/${c.maxHp}`], ['攻击', c.atk], ['防御', c.def], ['速度', c.spd]] as const).map(([label, val]) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--ink)', opacity: 0.5 }}>{label}</div>
                        <div style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>👤</span>
            <p>尚无灵侣</p>
            <p className={styles.hint}>通过探索七世获得灵侣</p>
          </div>
        )}
      </div>
    </div>
  );
}
