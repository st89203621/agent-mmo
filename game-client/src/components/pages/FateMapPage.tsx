import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { fetchRelations } from '../../services/api';
import type { Relation } from '../../types';
import styles from './FateMapPage.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const MAP = 320;
const CX = MAP / 2;
const CY = MAP / 2;
const MAX_R = 138;

const RINGS = [
  { minFate: 80, ratio: 0.20, color: '#e8708a', bg: 'rgba(232,112,138,0.07)', label: '情深缘定' },
  { minFate: 60, ratio: 0.38, color: '#c9a84c', bg: 'rgba(201,168,76,0.06)', label: '心意相通' },
  { minFate: 30, ratio: 0.57, color: '#7ca8c6', bg: 'rgba(124,168,198,0.05)', label: '渐生情愫' },
  { minFate: 0,  ratio: 0.76, color: '#888',    bg: 'rgba(136,136,136,0.04)', label: '萍水相逢' },
] as const;

type Ring = (typeof RINGS)[number];

function getRing(score: number): Ring {
  return RINGS.find(r => score >= r.minFate) ?? RINGS[RINGS.length - 1];
}

interface NodePos { rel: Relation; x: number; y: number; ring: Ring; nodeR: number; }

function computePositions(relations: Relation[]): NodePos[] {
  const grouped = new Map<Ring, Relation[]>();
  RINGS.forEach(r => grouped.set(r, []));
  relations.forEach(rel => grouped.get(getRing(rel.fateScore))!.push(rel));

  return relations.map(rel => {
    const ring = getRing(rel.fateScore);
    const nodes = grouped.get(ring)!;
    const idx = nodes.indexOf(rel);
    const count = nodes.length;
    const angleOffset = -Math.PI / 2 + (ring.minFate * 0.018);
    const angle = angleOffset + (2 * Math.PI * idx) / Math.max(count, 1);
    const r = ring.ratio * MAX_R;
    const nodeR = 4 + (rel.fateScore / 100) * 8;
    return { rel, x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle), ring, nodeR };
  });
}

const StarField = memo(function StarField() {
  return (
    <div className={styles.starfield} aria-hidden>
      {Array.from({ length: 60 }, (_, i) => (
        <span
          key={i}
          className={styles.star}
          style={{
            left: `${(i * 43 + 11) % 100}%`,
            top: `${(i * 59 + 7) % 100}%`,
            '--d': `${(i * 0.21) % 4}s`,
            '--s': `${0.6 + (i % 4) * 0.35}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
});

function DetailPanel({ rel, onClose, onChat }: {
  rel: Relation;
  onClose: () => void;
  onChat: (npcId: string) => void;
}) {
  const ring = getRing(rel.fateScore);
  return (
    <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>
      <div className={styles.detailHandle} />
      <div className={styles.detailHead}>
        <div className={styles.detailAvatar} style={{ borderColor: ring.color }}>
          {rel.imageUrl && (
            <img src={rel.imageUrl} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <span>{(rel.npcName || '?').charAt(0)}</span>
        </div>
        <div className={styles.detailInfo}>
          <div className={styles.detailName}>{rel.npcName}</div>
          <div className={styles.detailLevel} style={{ color: ring.color }}>{ring.label}</div>
        </div>
        <button className={styles.detailClose} onClick={onClose}>×</button>
      </div>
      <div className={styles.detailStats}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>缘分</span>
          <div className={styles.statBar}>
            <div className={styles.statFill} style={{ width: `${rel.fateScore}%`, background: ring.color }} />
          </div>
          <span className={styles.statVal}>{rel.fateScore}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>信任</span>
          <div className={styles.statBar}>
            <div className={styles.statFill} style={{ width: `${rel.trustScore}%`, background: 'var(--emotion-calm)' }} />
          </div>
          <span className={styles.statVal}>{rel.trustScore}</span>
        </div>
      </div>
      {rel.keyFacts && rel.keyFacts.length > 0 && (
        <div className={styles.keyFacts}>
          {rel.keyFacts.slice(0, 3).map((f, i) => (
            <div key={i} className={styles.factItem}>{f}</div>
          ))}
        </div>
      )}
      <button className={styles.chatBtn} style={{ borderColor: ring.color, color: ring.color }} onClick={() => onChat(rel.npcId)}>
        与之交谈
      </button>
    </div>
  );
}

export default function FateMapPage() {
  usePageBackground(PAGE_BG.FATE_MAP);
  const { navigateTo } = useGameStore();
  const { relations, setRelations } = usePlayerStore();
  const [loading, setLoading] = useState(relations.length === 0);
  const [selected, setSelected] = useState<Relation | null>(null);

  useEffect(() => {
    if (relations.length > 0) { setLoading(false); return; }
    fetchRelations()
      .then(r => setRelations(r.relations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const positions = useMemo(() => computePositions(relations), [relations]);
  const handleChat = useCallback((npcId: string) => navigateTo('story', { autoNpcId: npcId }), [navigateTo]);
  const dismiss = useCallback(() => setSelected(null), []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.loadingOrb} />
          <span>解读命运星图...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} onClick={dismiss}>
      <StarField />

      <div className={styles.subHeader}>
        <span className={styles.subCount}>{relations.length} 道牵绊</span>
      </div>

      <div className={styles.mapWrap}>
        <svg className={styles.svg} viewBox={`0 0 ${MAP} ${MAP}`} xmlns="http://www.w3.org/2000/svg">
          {/* Orbital ring guides */}
          {RINGS.map(ring => (
            <circle
              key={ring.minFate}
              cx={CX} cy={CY}
              r={ring.ratio * MAX_R}
              fill="none"
              stroke={ring.color}
              strokeWidth="0.5"
              strokeOpacity="0.22"
              strokeDasharray="3 9"
            />
          ))}

          {/* Connection lines */}
          {positions.map(({ rel, x, y, ring }) => (
            <line
              key={`l-${rel.npcId}`}
              x1={CX} y1={CY} x2={x} y2={y}
              stroke={ring.color}
              strokeWidth={selected?.npcId === rel.npcId ? 1.1 : 0.55}
              strokeOpacity={0.1 + (rel.fateScore / 100) * 0.55}
            />
          ))}

          {/* NPC nodes */}
          {positions.map(({ rel, x, y, ring, nodeR }) => {
            const isSel = selected?.npcId === rel.npcId;
            return (
              <g key={`n-${rel.npcId}`} className={styles.nodeGroup} onClick={e => { e.stopPropagation(); setSelected(rel); }}>
                <circle cx={x} cy={y} r={nodeR + 8} fill={ring.color} opacity={isSel ? 0.18 : 0.06} />
                {isSel && <circle cx={x} cy={y} r={nodeR + 14} fill="none" stroke={ring.color} strokeWidth="0.8" className={styles.pulseRing} />}
                <circle cx={x} cy={y} r={nodeR} fill={ring.color} opacity={isSel ? 1 : 0.8} />
                {isSel && (
                  <text x={x} y={y - nodeR - 7} textAnchor="middle" fontSize="8.5" fill={ring.color} opacity="0.95" fontFamily="var(--font-ui)">
                    {rel.npcName}
                  </text>
                )}
              </g>
            );
          })}

          {/* Center: Player */}
          <circle cx={CX} cy={CY} r={22} fill="rgba(201,168,76,0.06)" />
          <circle cx={CX} cy={CY} r={13} fill="rgba(201,168,76,0.14)" />
          <circle cx={CX} cy={CY} r={6.5} fill="#c9a84c" opacity="0.92" />
          <text x={CX} y={CY + 20} textAnchor="middle" fontSize="8" fill="rgba(201,168,76,0.75)" fontFamily="var(--font-ui)">你</text>
        </svg>
      </div>

      {relations.length === 0 && (
        <div className={styles.emptyHint}>
          <span>尚无缘分记录</span>
          <button className={styles.emptyBtn} onClick={() => navigateTo('story')}>前往结识人物</button>
        </div>
      )}

      <div className={styles.legend}>
        {RINGS.map(ring => (
          <div key={ring.minFate} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: ring.color }} />
            <span className={styles.legendLabel}>{ring.label}</span>
          </div>
        ))}
      </div>

      {selected && <DetailPanel rel={selected} onClose={dismiss} onChat={handleChat} />}
    </div>
  );
}
