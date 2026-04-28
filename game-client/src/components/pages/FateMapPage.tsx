import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchRelations,
  fetchMarriageState,
  fetchMatchmaking,
  fetchProposals,
  acceptMarriage,
  rejectMarriage,
  proposeMarriage,
  divorce,
  type MarriageState,
  type MatchmakingItem,
  type MarriageProposal,
} from '../../services/api';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
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

type TabKey = 'map' | 'matchmaking';

function MarriagePanel() {
  const playerId = usePlayerStore((s) => s.playerId);
  const [state, setState] = useState<MarriageState | null>(null);
  const [candidates, setCandidates] = useState<MatchmakingItem[]>([]);
  const [incoming, setIncoming] = useState<MarriageProposal[]>([]);
  const [outgoing, setOutgoing] = useState<MarriageProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [s, m, p] = await Promise.all([
      fetchMarriageState().catch(() => null),
      fetchMatchmaking().catch(() => ({ candidates: [] as MatchmakingItem[] })),
      fetchProposals().catch(() => ({ incoming: [] as MarriageProposal[], outgoing: [] as MarriageProposal[] })),
    ]);
    setState(s ?? { married: false });
    setCandidates(m.candidates);
    setIncoming(p.incoming);
    setOutgoing(p.outgoing);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const marriedDays = useMemo(() => {
    if (!state?.married || !state.marriedSince) return 0;
    return Math.max(0, Math.floor((Date.now() - state.marriedSince) / 86_400_000));
  }, [state]);

  const handlePropose = useCallback(async (target: MatchmakingItem) => {
    if (state?.married) { toast.warning('你已婚配，无法再提亲'); return; }
    if (String(target.playerId) === playerId) { toast.warning('不能向自己求婚'); return; }
    const ok = await confirmDialog({
      title: '提 亲',
      message: `向「${target.name}」递送红笺，确定要提亲吗？`,
      confirmText: '提 亲',
    });
    if (!ok) return;
    setBusy(`propose-${target.playerId}`);
    try {
      await proposeMarriage(target.playerId);
      toast.success('提亲红笺已送达');
      await reload();
    } catch {
      toast.error('系统繁忙，请稍后再试');
    }
    setBusy(null);
  }, [state, playerId, reload]);

  const handleAccept = useCallback(async (p: MarriageProposal) => {
    setBusy(`accept-${p.proposalId}`);
    try {
      await acceptMarriage(p.proposalId);
      toast.success('已应允此姻缘');
      await reload();
    } catch {
      toast.error('系统繁忙，请稍后再试');
    }
    setBusy(null);
  }, [reload]);

  const handleReject = useCallback(async (p: MarriageProposal) => {
    setBusy(`reject-${p.proposalId}`);
    try {
      await rejectMarriage(p.proposalId);
      toast.info('已婉拒此姻缘');
      await reload();
    } catch {
      toast.error('系统繁忙，请稍后再试');
    }
    setBusy(null);
  }, [reload]);

  const handleDivorce = useCallback(async () => {
    const ok = await confirmDialog({
      title: '和 离',
      message: '此举将解除当前婚姻，是否继续？',
      confirmText: '和 离',
      danger: true,
    });
    if (!ok) return;
    setBusy('divorce');
    try {
      await divorce();
      toast.success('已和离');
      await reload();
    } catch {
      toast.error('系统繁忙，请稍后再试');
    }
    setBusy(null);
  }, [reload]);

  if (loading) {
    return (
      <div className={styles.marriageWrap}>
        <div className={styles.mEmpty}>姻缘簿载入中...</div>
      </div>
    );
  }

  return (
    <div className={styles.marriageWrap}>
      <div className={styles.mStatusCard}>
        <div className={styles.mStatusIcon}>囍</div>
        <div className={styles.mStatusBody}>
          {state?.married ? (
            <>
              <div className={styles.mStatusTitle}>已 婚 · {state.spouseName || '佳偶'}</div>
              <div className={styles.mStatusSub}>结发同心 {marriedDays} 日</div>
            </>
          ) : (
            <>
              <div className={styles.mStatusTitle}>尚 待 良 缘</div>
              <div className={styles.mStatusSub}>静候良人，或主动出击</div>
            </>
          )}
        </div>
        {state?.married && (
          <button
            className={styles.mDivorceBtn}
            onClick={handleDivorce}
            disabled={busy === 'divorce'}
            type="button"
          >
            {busy === 'divorce' ? '...' : '和 离'}
          </button>
        )}
      </div>

      <div className={styles.mSect}>
        <span>红 娘 推 荐</span>
        <span className={styles.mSectCount}>{candidates.length} 位</span>
      </div>
      <div className={styles.mList}>
        {candidates.length === 0 ? (
          <div className={styles.mEmpty}>暂无推荐人选</div>
        ) : (
          candidates.map((c) => (
            <div key={c.playerId} className={styles.mCard}>
              <div className={styles.mAvatar}>
                {c.portrait && (
                  <img src={c.portrait} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <span>{(c.name || '?').charAt(0)}</span>
              </div>
              <div className={styles.mCardBody}>
                <div className={styles.mCardName}>
                  {c.name}
                  <span className={styles.mCardLevel}>Lv {c.level}</span>
                  <span className={styles.mCardScore}>缘 {c.fateScore}</span>
                </div>
                <div className={styles.mCardReason}>{c.reason}</div>
              </div>
              <div className={styles.mCardActs}>
                <button
                  className={styles.mCardBtn}
                  onClick={() => handlePropose(c)}
                  disabled={busy === `propose-${c.playerId}` || !!state?.married}
                  type="button"
                >
                  {busy === `propose-${c.playerId}` ? '...' : '求 婚'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.mSect}>
        <span>红 笺 往 来</span>
        <span className={styles.mSectCount}>收 {incoming.length} · 寄 {outgoing.length}</span>
      </div>
      <div className={styles.mList}>
        {incoming.length === 0 && outgoing.length === 0 ? (
          <div className={styles.mEmpty}>暂无进行中的求婚</div>
        ) : (
          <>
            {incoming.map((p) => (
              <div key={`in-${p.proposalId}`} className={styles.mPropItem}>
                <span className={styles.mPropDir}>收</span>
                <span>{p.fromName} 向你提亲</span>
                <span className={styles.mPropMeta}>
                  <button
                    className={styles.mPropAccept}
                    onClick={() => handleAccept(p)}
                    disabled={busy === `accept-${p.proposalId}`}
                    type="button"
                  >
                    {busy === `accept-${p.proposalId}` ? '...' : '应 允'}
                  </button>
                  <button
                    className={styles.mPropReject}
                    onClick={() => handleReject(p)}
                    disabled={busy === `reject-${p.proposalId}`}
                    type="button"
                  >
                    {busy === `reject-${p.proposalId}` ? '...' : '婉 拒'}
                  </button>
                </span>
              </div>
            ))}
            {outgoing.map((p) => (
              <div key={`out-${p.proposalId}`} className={styles.mPropItem}>
                <span className={styles.mPropDir}>寄</span>
                <span>已向 {p.toName} 提亲，待其回应</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default function FateMapPage() {
  usePageBackground(PAGE_BG.FATE_MAP);
  const { navigateTo } = useGameStore();
  const { relations, setRelations } = usePlayerStore();
  const [loading, setLoading] = useState(relations.length === 0);
  const [selected, setSelected] = useState<Relation | null>(null);
  const [tab, setTab] = useState<TabKey>('map');

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

  const tabBar = (
    <div className={styles.tabBar}>
      <button
        className={`${styles.tabBtn} ${tab === 'map' ? styles.tabBtnOn : ''}`.trim()}
        onClick={() => setTab('map')}
        type="button"
      >
        缘 分 地 图
      </button>
      <button
        className={`${styles.tabBtn} ${tab === 'matchmaking' ? styles.tabBtnOn : ''}`.trim()}
        onClick={() => setTab('matchmaking')}
        type="button"
      >
        婚 介
      </button>
    </div>
  );

  if (tab === 'matchmaking') {
    return (
      <div className={styles.page}>
        <StarField />
        {tabBar}
        <MarriagePanel />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        {tabBar}
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
      {tabBar}

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
