import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createCoexplore, joinCoexplore, getCoexploreSession,
  listCoexploreWaiting, coexploreExplore, coexploreVote,
  coexploreBoss, leaveCoexplore,
} from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import type { CoexploreSessionData, CoexploreLocation, CoexploreRoundData, CoexploreVoteOption } from '../../types';

const POLL_INTERVAL = 2000;

// ── 颜色常量 ──────────────────────────────────
const C = {
  bg: '#0a0a12',
  card: 'rgba(255,255,255,0.05)',
  gold: '#e8c44a',
  goldDim: 'rgba(232,196,74,0.15)',
  green: '#4caf50',
  red: '#f44336',
  blue: '#5c9ce6',
  white: '#e0e0e0',
  gray: '#888',
  darkGray: '#333',
} as const;

export default function CoexplorePage() {
  const navigateTo = useGameStore(s => s.navigateTo);
  const playerId = Number(usePlayerStore(s => s.playerId));

  const [session, setSession] = useState<CoexploreSessionData | null>(null);
  const [waitingList, setWaitingList] = useState<CoexploreSessionData[]>([]);
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [attacking, setAttacking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const isHost = session ? playerId === session.hostId : false;
  const myName = isHost ? session?.hostName : session?.guestName;
  const partnerName = isHost ? session?.guestName : session?.hostName;
  const myFate = isHost ? session?.hostFateValue ?? 0 : session?.guestFateValue ?? 0;
  const partnerFate = isHost ? session?.guestFateValue ?? 0 : session?.hostFateValue ?? 0;

  // ── 轮询同步 ──────────────────────────────────

  const pollSession = useCallback(async () => {
    if (!session) return;
    try {
      const s = await getCoexploreSession(session.sessionId);
      setSession(s);
    } catch { /* ignore */ }
  }, [session?.sessionId]);

  useEffect(() => {
    if (session && session.status !== 'COMPLETED') {
      pollRef.current = setInterval(pollSession, POLL_INTERVAL);
      return () => clearInterval(pollRef.current);
    }
  }, [session?.sessionId, session?.status, pollSession]);

  // 加载等待中的房间
  useEffect(() => {
    if (!session) {
      listCoexploreWaiting().then(d => setWaitingList(d.sessions)).catch(() => {});
    }
  }, [session]);

  // ── 操作 ──────────────────────────────────

  const handleCreate = async () => {
    setLoading(true);
    try {
      const s = await createCoexplore();
      setSession(s);
    } finally { setLoading(false); }
  };

  const handleJoin = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const s = await joinCoexplore(id.trim());
      setSession(s);
    } finally { setLoading(false); }
  };

  const handleExplore = async () => {
    if (!session || !selectedLoc) return;
    setLoading(true);
    try {
      const s = await coexploreExplore(session.sessionId, selectedLoc);
      setSession(s);
      setSelectedLoc(null);
    } finally { setLoading(false); }
  };

  const handleVote = async () => {
    if (!session || !selectedVote) return;
    setLoading(true);
    try {
      const s = await coexploreVote(session.sessionId, selectedVote);
      setSession(s);
      setSelectedVote(null);
    } finally { setLoading(false); }
  };

  const handleBossAttack = async () => {
    if (!session || attacking) return;
    setAttacking(true);
    try {
      const s = await coexploreBoss(session.sessionId);
      setSession(s);
    } finally { setAttacking(false); }
  };

  const handleLeave = async () => {
    if (!session) return;
    await leaveCoexplore(session.sessionId);
    setSession(null);
  };

  // ── 当前轮次数据 ──────────────────────────────────

  const currentRound: CoexploreRoundData | null =
    session?.rounds?.length ? session.rounds[session.rounds.length - 1] : null;

  const myChoice = isHost ? currentRound?.hostLocationId : currentRound?.guestLocationId;
  const partnerChoice = isHost ? currentRound?.guestLocationId : currentRound?.hostLocationId;
  const myDiscovery = isHost ? currentRound?.hostDiscovery : currentRound?.guestDiscovery;
  const partnerDiscovery = isHost ? currentRound?.guestDiscovery : currentRound?.hostDiscovery;
  const partnerTrace = isHost ? currentRound?.guestTrace : currentRound?.hostTrace;
  const myVote = isHost ? currentRound?.hostVote : currentRound?.guestVote;
  const partnerVoted = isHost ? !!currentRound?.guestVote : !!currentRound?.hostVote;

  // ── 渲染 ──────────────────────────────────

  // 未进入会话 → 大厅
  if (!session) {
    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title="共探书境" onBack={() => navigateTo('home')} />
        <p style={{ color: C.gray, fontSize: 13, marginBottom: 20 }}>
          两人同入书境，分头探索，汇合拼图，合力击Boss。缘分值越高，掉落越丰厚。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn text={loading ? '创建中...' : '创建房间'} color={C.gold} onClick={handleCreate} disabled={loading} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="输入房间ID加入"
              style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${C.darkGray}`, background: '#111', color: '#fff', fontSize: 14 }} />
            <Btn text="加入" color={C.green} onClick={() => handleJoin(joinId)} disabled={loading} style={{ padding: '12px 20px' }} />
          </div>
        </div>
        {waitingList.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ color: C.gray, fontSize: 12, marginBottom: 8 }}>等待中的房间</div>
            {waitingList.map(s => (
              <div key={s.sessionId} onClick={() => handleJoin(s.sessionId)}
                style={{ padding: 12, marginBottom: 8, background: C.goldDim, borderRadius: 8, cursor: 'pointer' }}>
                <span style={{ color: C.gold, fontSize: 14 }}>{s.hostName || '未知'}</span>
                <span style={{ color: C.gray, fontSize: 12, marginLeft: 8 }}>#{s.sessionId}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── 等待对方加入 ──────────────────────────────────
  if (session.status === 'WAITING') {
    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title="等待同伴" onBack={handleLeave} />
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.gold, fontSize: 18, marginBottom: 12 }}>房间号</div>
            <div style={{ color: '#fff', fontSize: 28, fontFamily: 'monospace', letterSpacing: 4, marginBottom: 16 }}>
              {session.sessionId}
            </div>
            <div style={{ color: C.gray, fontSize: 13 }}>将此房间号分享给好友，等待加入...</div>
            <div style={{ marginTop: 20 }}>
              <LoadingDots />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ── 探索阶段 ──────────────────────────────────
  if (session.status === 'EXPLORING') {
    const alreadyChosen = !!myChoice;
    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title={`第${session.currentRound}轮 · 探索`} onBack={handleLeave} />
        <FateBar myFate={myFate} partnerFate={partnerFate} myName={myName} partnerName={partnerName} />

        {alreadyChosen ? (
          <Card>
            <div style={{ textAlign: 'center', color: C.gray }}>
              <div style={{ fontSize: 16, marginBottom: 8 }}>你已选择探索地点</div>
              <div style={{ fontSize: 13 }}>等待 <span style={{ color: C.gold }}>{partnerName}</span> 选择...</div>
              <div style={{ marginTop: 16 }}><LoadingDots /></div>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ color: C.gray, fontSize: 13, marginBottom: 12 }}>选择一个地点探索（你的选择对方不可见）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {session.locations.map(loc => (
                <LocationCard key={loc.id} loc={loc} selected={selectedLoc === loc.id}
                  onClick={() => setSelectedLoc(loc.id)} />
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn text="确认探索" color={C.gold} onClick={handleExplore} disabled={!selectedLoc || loading} full />
            </div>
          </>
        )}

        {/* 对方的痕迹 */}
        {partnerTrace && (
          <Card style={{ marginTop: 16, borderLeft: `3px solid ${C.blue}` }}>
            <div style={{ color: C.blue, fontSize: 12, marginBottom: 4 }}>对方的痕迹</div>
            <div style={{ color: C.white, fontSize: 14 }}>{partnerTrace}</div>
          </Card>
        )}
      </div>
    );
  }

  // ── 汇合/投票阶段 ──────────────────────────────────
  if (session.status === 'GATHERING' || session.status === 'VOTING') {
    const iVoted = !!myVote;
    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title={`第${session.currentRound}轮 · 汇合`} onBack={handleLeave} />
        <FateBar myFate={myFate} partnerFate={partnerFate} myName={myName} partnerName={partnerName} />

        {/* 双方发现 */}
        <div style={{ color: C.gold, fontSize: 14, marginBottom: 8 }}>探索发现</div>
        <Card style={{ borderLeft: `3px solid ${C.gold}`, marginBottom: 8 }}>
          <div style={{ color: C.gold, fontSize: 12, marginBottom: 4 }}>你的发现</div>
          <div style={{ color: C.white, fontSize: 14 }}>{myDiscovery || '无'}</div>
        </Card>
        <Card style={{ borderLeft: `3px solid ${C.blue}`, marginBottom: 16 }}>
          <div style={{ color: C.blue, fontSize: 12, marginBottom: 4 }}>{partnerName} 的发现</div>
          <div style={{ color: C.white, fontSize: 14 }}>{partnerDiscovery || '无'}</div>
        </Card>

        {/* 投票 */}
        {iVoted ? (
          <Card>
            <div style={{ textAlign: 'center', color: C.gray }}>
              <div>你已投票，等待 <span style={{ color: C.gold }}>{partnerName}</span>...</div>
              {!partnerVoted && <div style={{ marginTop: 12 }}><LoadingDots /></div>}
            </div>
          </Card>
        ) : (
          <>
            <div style={{ color: C.gold, fontSize: 14, marginBottom: 8 }}>下一步怎么做？</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentRound?.voteOptions?.map((opt: CoexploreVoteOption) => (
                <div key={opt.id} onClick={() => setSelectedVote(opt.id)}
                  style={{
                    padding: 14, borderRadius: 10, cursor: 'pointer',
                    background: selectedVote === opt.id ? C.goldDim : C.card,
                    border: selectedVote === opt.id ? `2px solid ${C.gold}` : '2px solid transparent',
                  }}>
                  <div style={{ color: selectedVote === opt.id ? C.gold : C.white, fontSize: 14, fontWeight: 600 }}>{opt.text}</div>
                  <div style={{ color: C.gray, fontSize: 12, marginTop: 2 }}>{opt.description}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn text="确认投票" color={C.gold} onClick={handleVote} disabled={!selectedVote || loading} full />
            </div>
          </>
        )}

        {/* 投票结果（双方都投完后显示） */}
        {currentRound?.voteResult && (
          <Card style={{ marginTop: 16, borderLeft: `3px solid ${C.green}` }}>
            <div style={{ color: C.green, fontSize: 12, marginBottom: 4 }}>决议结果</div>
            <div style={{ color: C.white, fontSize: 14 }}>
              {currentRound.voteOptions?.find(o => o.id === currentRound.voteResult)?.text ?? currentRound.voteResult}
              {currentRound.hostVote === currentRound.guestVote && (
                <span style={{ color: C.gold, fontSize: 12, marginLeft: 8 }}>意见一致 +10缘分</span>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ── Boss战 ──────────────────────────────────
  if (session.status === 'BOSS') {
    const totalDamage = session.bossDamageHost + session.bossDamageGuest;
    const hpPercent = Math.max(0, (session.bossHp - totalDamage) / session.bossHp * 100);
    const myDamage = isHost ? session.bossDamageHost : session.bossDamageGuest;
    const partnerDamage = isHost ? session.bossDamageGuest : session.bossDamageHost;

    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title="终局 · Boss战" />
        <FateBar myFate={myFate} partnerFate={partnerFate} myName={myName} partnerName={partnerName} />

        <Card style={{ marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🐉</div>
            <div style={{ color: C.gold, fontSize: 18, marginBottom: 8 }}>书境守护者</div>
            {/* 血条 */}
            <div style={{ background: C.darkGray, borderRadius: 8, height: 20, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                width: `${hpPercent}%`, height: '100%', borderRadius: 8,
                background: hpPercent > 50 ? C.red : hpPercent > 20 ? '#ff9800' : '#f44336',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ color: C.gray, fontSize: 12 }}>
              HP: {Math.max(0, session.bossHp - totalDamage)} / {session.bossHp}
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Card style={{ flex: 1 }}>
            <div style={{ color: C.gold, fontSize: 12 }}>你的伤害</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{myDamage}</div>
            <div style={{ color: C.gray, fontSize: 11 }}>缘分加成 +{Math.floor(myFate / 5)}</div>
          </Card>
          <Card style={{ flex: 1 }}>
            <div style={{ color: C.blue, fontSize: 12 }}>{partnerName} 伤害</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{partnerDamage}</div>
            <div style={{ color: C.gray, fontSize: 11 }}>缘分加成 +{Math.floor(partnerFate / 5)}</div>
          </Card>
        </div>

        <Btn text={attacking ? '攻击中...' : '发动攻击'} color={C.red} onClick={handleBossAttack} disabled={attacking} full />
      </div>
    );
  }

  // ── 结算 ──────────────────────────────────
  if (session.status === 'COMPLETED') {
    const fateCoeff = myFate >= 90 ? 1.5 : myFate >= 60 ? 1.0 : myFate >= 30 ? 0.6 : 0.3;
    const coeffLabel = myFate >= 90 ? '金光' : myFate >= 60 ? '普通' : myFate >= 30 ? '减少' : '基础';
    const coeffColor = myFate >= 90 ? C.gold : myFate >= 60 ? C.green : myFate >= 30 ? '#ff9800' : C.red;
    const minFate = Math.min(myFate, partnerFate);

    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title="探索完成" />

        <Card style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📜</div>
          <div style={{ color: C.gold, fontSize: 20, marginBottom: 16 }}>书境探索完成</div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ color: C.gray, fontSize: 12 }}>你的缘分值</div>
              <div style={{ color: C.gold, fontSize: 24, fontWeight: 700 }}>{myFate}</div>
            </div>
            <div>
              <div style={{ color: C.gray, fontSize: 12 }}>{partnerName}</div>
              <div style={{ color: C.blue, fontSize: 24, fontWeight: 700 }}>{partnerFate}</div>
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ color: C.gray, fontSize: 12, marginBottom: 4 }}>掉落系数</div>
            <div style={{ color: coeffColor, fontSize: 18, fontWeight: 700 }}>×{fateCoeff} ({coeffLabel})</div>
          </div>

          {minFate > 70 && (
            <div style={{ color: C.gold, fontSize: 14, marginBottom: 12 }}>
              团队默契奖励：额外宝箱 ×1
            </div>
          )}
        </Card>

        {/* 轮次回顾 */}
        <div style={{ color: C.gold, fontSize: 14, marginBottom: 8 }}>探索回顾</div>
        {session.rounds.map(r => (
          <Card key={r.round} style={{ marginBottom: 8 }}>
            <div style={{ color: C.gold, fontSize: 12, marginBottom: 4 }}>第{r.round}轮</div>
            <div style={{ color: C.white, fontSize: 13 }}>
              你的发现：{(isHost ? r.hostDiscovery : r.guestDiscovery) || '—'}
            </div>
            <div style={{ color: C.gray, fontSize: 13 }}>
              {partnerName}：{(isHost ? r.guestDiscovery : r.hostDiscovery) || '—'}
            </div>
            {r.voteResult && (
              <div style={{ color: C.green, fontSize: 12, marginTop: 4 }}>
                决议：{r.voteOptions?.find(o => o.id === r.voteResult)?.text ?? r.voteResult}
                {r.hostVote === r.guestVote && <span style={{ color: C.gold }}> (一致)</span>}
              </div>
            )}
          </Card>
        ))}

        <div style={{ marginTop: 16 }}>
          <Btn text="返回大厅" color={C.gold} onClick={() => { setSession(null); navigateTo('home'); }} full />
        </div>
      </div>
    );
  }

  return null;
}

// ── 子组件 ──────────────────────────────────

function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      {onBack && (
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: C.gray, fontSize: 18, cursor: 'pointer' }}>←</button>
      )}
      <h2 style={{ color: C.gold, margin: 0, fontSize: 20 }}>{title}</h2>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: 16, ...style }}>
      {children}
    </div>
  );
}

function Btn({ text, color, onClick, disabled, full, style }: {
  text: string; color: string; onClick: () => void;
  disabled?: boolean; full?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '14px 20px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer', width: full ? '100%' : undefined,
        background: disabled ? '#444' : color, color: color === C.gold ? '#000' : '#fff',
        opacity: disabled ? 0.5 : 1, transition: 'opacity 0.2s', ...style,
      }}
    >{text}</button>
  );
}

function FateBar({ myFate, partnerFate, myName, partnerName }: {
  myFate: number; partnerFate: number; myName?: string; partnerName?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '8px 12px', background: C.card, borderRadius: 8 }}>
      <div>
        <div style={{ color: C.gold, fontSize: 11 }}>{myName || '你'}</div>
        <div style={{ color: C.gold, fontSize: 16, fontWeight: 700 }}>缘 {myFate}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', color: C.gray, fontSize: 12 }}>共探中</div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: C.blue, fontSize: 11 }}>{partnerName || '同伴'}</div>
        <div style={{ color: C.blue, fontSize: 16, fontWeight: 700 }}>缘 {partnerFate}</div>
      </div>
    </div>
  );
}

function LocationCard({ loc, selected, onClick }: {
  loc: CoexploreLocation; selected: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick}
      style={{
        padding: 14, borderRadius: 10, cursor: 'pointer',
        background: selected ? C.goldDim : C.card,
        border: selected ? `2px solid ${C.gold}` : '2px solid transparent',
        transition: 'all 0.15s',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: selected ? C.gold : C.white, fontSize: 15, fontWeight: 600 }}>{loc.name}</div>
        <div style={{ color: C.gold, fontSize: 12 }}>+{loc.fateReward}缘</div>
      </div>
      <div style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>{loc.description}</div>
    </div>
  );
}

function LoadingDots() {
  return <span style={{ color: C.gold, fontSize: 20, letterSpacing: 4 }}>···</span>;
}
