import { useState, useEffect, useRef } from 'react';
import {
  createCoexplore, joinCoexplore,
  coexploreExplore, coexploreReason,
  coexploreBoss, leaveCoexplore,
  subscribeCoexplore, subscribeCoexploreLobby,
} from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';
import type { CoexploreSessionData, CoexploreRoundData } from '../../types';

const C = {
  bg: '#0a0a12', card: 'rgba(255,255,255,0.05)',
  gold: '#e8c44a', goldDim: 'rgba(232,196,74,0.15)',
  green: '#4caf50', red: '#f44336', blue: '#5c9ce6',
  white: '#e0e0e0', gray: '#888', darkGray: '#333',
} as const;

const RESULT_LABEL: Record<string, { text: string; color: string; mult: number }> = {
  PERFECT:   { text: '完美破案', color: C.gold, mult: 1.5 },
  CONSENSUS: { text: '心意相通', color: C.green, mult: 1.0 },
  SPLIT:     { text: '各执己见', color: '#ff9800', mult: 0.8 },
  LOST:      { text: '迷失方向', color: C.red, mult: 0.5 },
};

export default function CoexplorePage() {
  const playerId = Number(usePlayerStore(s => s.playerId));

  const [session, setSession] = useState<CoexploreSessionData | null>(null);
  const [waitingList, setWaitingList] = useState<CoexploreSessionData[]>([]);
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [attacking, setAttacking] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const isHost = session ? playerId === session.hostId : false;
  const myName = isHost ? session?.hostName : session?.guestName;
  const partnerName = isHost ? session?.guestName : session?.hostName;
  const myFate = isHost ? session?.hostFateValue ?? 0 : session?.guestFateValue ?? 0;
  const partnerFate = isHost ? session?.guestFateValue ?? 0 : session?.hostFateValue ?? 0;

  // ── SSE 实时订阅 ──

  useEffect(() => {
    if (session && session.status !== 'COMPLETED') {
      unsubRef.current?.();
      unsubRef.current = subscribeCoexplore(session.sessionId, setSession);
      return () => { unsubRef.current?.(); unsubRef.current = null; };
    }
  }, [session?.sessionId, session?.status]);

  // ── 大厅实时订阅 ──

  useEffect(() => {
    if (!session) {
      return subscribeCoexploreLobby(d => setWaitingList(d.sessions));
    }
  }, [!session]);

  // ── 操作 ──

  const handleCreate = async () => {
    setLoading(true);
    try { setSession(await createCoexplore()); } finally { setLoading(false); }
  };

  const handleJoin = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try { setSession(await joinCoexplore(id.trim())); } finally { setLoading(false); }
  };

  const handleExplore = async () => {
    if (!session || !selectedLoc) return;
    setLoading(true);
    try { setSession(await coexploreExplore(session.sessionId, selectedLoc)); setSelectedLoc(null); }
    finally { setLoading(false); }
  };

  const handleReason = async () => {
    if (!session || selectedAnswer === null) return;
    setLoading(true);
    try { setSession(await coexploreReason(session.sessionId, selectedAnswer)); setSelectedAnswer(null); }
    finally { setLoading(false); }
  };

  const handleBossAttack = async () => {
    if (!session || attacking) return;
    setAttacking(true);
    try { setSession(await coexploreBoss(session.sessionId)); } finally { setAttacking(false); }
  };

  const handleLeave = async () => {
    if (!session) return;
    await leaveCoexplore(session.sessionId);
    setSession(null);
  };

  // ── 派生数据 ──

  const currentRound: CoexploreRoundData | null =
    session?.rounds?.length ? session.rounds[session.rounds.length - 1] : null;
  const myChoice = isHost ? currentRound?.hostLocationId : currentRound?.guestLocationId;
  const partnerTrace = isHost ? currentRound?.guestTrace : currentRound?.hostTrace;
  const myAnswer = isHost ? session?.hostAnswer ?? -1 : session?.guestAnswer ?? -1;
  const partnerAnswered = isHost ? (session?.guestAnswer ?? -1) >= 0 : (session?.hostAnswer ?? -1) >= 0;

  // 已完成轮次的所有线索
  const allClues = (session?.rounds ?? []).filter(r => r.hostClue && r.guestClue);

  // ── 渲染 ──

  // 大厅
  if (!session) {
    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title="共探书境" />
        <p style={{ color: C.gray, fontSize: 13, marginBottom: 20 }}>
          两人同入书境，分头收集线索，合力推理真相。选择不同地点获得互补线索，默契越高奖励越丰。
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

  // 等待
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
            <div style={{ marginTop: 20, color: C.gold, fontSize: 20, letterSpacing: 4 }}>···</div>
          </div>
        </Card>
      </div>
    );
  }

  // 探索阶段
  if (session.status === 'EXPLORING') {
    const alreadyChosen = !!myChoice;
    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title={`第${session.currentRound}轮 · 探索`} onBack={handleLeave} />
        <FateBar myFate={myFate} partnerFate={partnerFate} myName={myName} partnerName={partnerName} />

        {/* 谜题背景 */}
        {session.mysteryBackground && (
          <Card style={{ marginBottom: 12, borderLeft: `3px solid ${C.gold}` }}>
            <div style={{ color: C.gold, fontSize: 12, marginBottom: 4 }}>谜题</div>
            <div style={{ color: C.white, fontSize: 14, lineHeight: 1.6 }}>{session.mysteryBackground}</div>
          </Card>
        )}

        {/* 已收集线索回顾 */}
        {allClues.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: C.gray, fontSize: 12, marginBottom: 6 }}>已收集线索</div>
            {allClues.map(r => (
              <div key={r.round} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <ClueChip color={C.gold}>{r.hostClue}</ClueChip>
                <ClueChip color={C.blue}>{r.guestClue}</ClueChip>
              </div>
            ))}
          </div>
        )}

        {alreadyChosen ? (
          <Card>
            <div style={{ textAlign: 'center', color: C.gray }}>
              <div style={{ fontSize: 16, marginBottom: 8 }}>你已选择探索地点</div>
              <div style={{ fontSize: 13 }}>等待 <span style={{ color: C.gold }}>{partnerName}</span> 选择...</div>
              <div style={{ marginTop: 12, color: C.gray, fontSize: 12 }}>选择不同地点可获得互补线索（缘分 +15）</div>
              <div style={{ marginTop: 16, color: C.gold, fontSize: 20, letterSpacing: 4 }}>···</div>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ color: C.gray, fontSize: 13, marginBottom: 12 }}>
              选择一个地点探索（选不同地点 = 更多线索 + 更高缘分）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {session.locations.map(loc => (
                <div key={loc.id} onClick={() => setSelectedLoc(loc.id)}
                  style={{
                    padding: 14, borderRadius: 10, cursor: 'pointer',
                    background: selectedLoc === loc.id ? C.goldDim : C.card,
                    border: selectedLoc === loc.id ? `2px solid ${C.gold}` : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ color: selectedLoc === loc.id ? C.gold : C.white, fontSize: 15, fontWeight: 600 }}>{loc.name}</div>
                  <div style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>{loc.description}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn text="确认探索" color={C.gold} onClick={handleExplore} disabled={!selectedLoc || loading} full />
            </div>
          </>
        )}

        {/* 对方痕迹 */}
        {partnerTrace && (
          <Card style={{ marginTop: 16, borderLeft: `3px solid ${C.blue}` }}>
            <div style={{ color: C.blue, fontSize: 12, marginBottom: 4 }}>{partnerName} 的痕迹</div>
            <div style={{ color: C.white, fontSize: 14 }}>{partnerTrace}</div>
          </Card>
        )}
      </div>
    );
  }

  // 推理阶段
  if (session.status === 'REASONING') {
    const iAnswered = myAnswer >= 0;
    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title="推理 · 定论" onBack={handleLeave} />
        <FateBar myFate={myFate} partnerFate={partnerFate} myName={myName} partnerName={partnerName} />

        {/* 谜题回顾 */}
        <Card style={{ marginBottom: 12, borderLeft: `3px solid ${C.gold}` }}>
          <div style={{ color: C.gold, fontSize: 12, marginBottom: 4 }}>谜题</div>
          <div style={{ color: C.white, fontSize: 14, lineHeight: 1.6 }}>{session.mysteryBackground}</div>
        </Card>

        {/* 所有线索 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.gold, fontSize: 14, marginBottom: 8 }}>收集到的线索</div>
          {allClues.map(r => (
            <Card key={r.round} style={{ marginBottom: 8 }}>
              <div style={{ color: C.gray, fontSize: 11, marginBottom: 6 }}>第{r.round}轮 {r.sameLocation ?
                <span style={{ color: '#ff9800' }}>（同一地点）</span> :
                <span style={{ color: C.green }}>（不同地点）</span>}
              </div>
              <div style={{ color: C.gold, fontSize: 13, marginBottom: 4 }}>
                {isHost ? '你' : partnerName}：{r.hostClue}
              </div>
              <div style={{ color: C.blue, fontSize: 13 }}>
                {isHost ? partnerName : '你'}：{r.guestClue}
              </div>
            </Card>
          ))}
        </div>

        {/* 嫌疑人选择 */}
        {iAnswered ? (
          <Card>
            <div style={{ textAlign: 'center', color: C.gray }}>
              <div>你已提交推理，等待 <span style={{ color: C.gold }}>{partnerName}</span>...</div>
              {!partnerAnswered && <div style={{ marginTop: 12, color: C.gold, fontSize: 20, letterSpacing: 4 }}>···</div>}
            </div>
          </Card>
        ) : (
          <>
            <div style={{ color: C.gold, fontSize: 14, marginBottom: 8 }}>你认为真相是？</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {session.suspects?.map((suspect, i) => (
                <div key={i} onClick={() => setSelectedAnswer(i)}
                  style={{
                    padding: 14, borderRadius: 10, cursor: 'pointer',
                    background: selectedAnswer === i ? C.goldDim : C.card,
                    border: selectedAnswer === i ? `2px solid ${C.gold}` : '2px solid transparent',
                  }}>
                  <div style={{ color: selectedAnswer === i ? C.gold : C.white, fontSize: 14, fontWeight: 600 }}>
                    嫌疑{i + 1}
                  </div>
                  <div style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>{suspect}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn text="提交推理" color={C.gold} onClick={handleReason} disabled={selectedAnswer === null || loading} full />
            </div>
            <div style={{ textAlign: 'center', color: C.gray, fontSize: 12, marginTop: 8 }}>
              与同伴选择一致可获得额外缘分 +20
            </div>
          </>
        )}
      </div>
    );
  }

  // Boss 战
  if (session.status === 'BOSS') {
    const totalDamage = session.bossDamageHost + session.bossDamageGuest;
    const hpPercent = Math.max(0, (session.bossHp - totalDamage) / session.bossHp * 100);
    const myDamage = isHost ? session.bossDamageHost : session.bossDamageGuest;
    const partnerDamage = isHost ? session.bossDamageGuest : session.bossDamageHost;
    const result = session.reasoningResult ? RESULT_LABEL[session.reasoningResult] : null;

    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title="终局 · 讨伐" />
        <FateBar myFate={myFate} partnerFate={partnerFate} myName={myName} partnerName={partnerName} />

        {/* 推理结果 */}
        {result && (
          <Card style={{ marginBottom: 12, textAlign: 'center', borderLeft: `3px solid ${result.color}` }}>
            <div style={{ color: result.color, fontSize: 16, fontWeight: 700 }}>{result.text}</div>
            <div style={{ color: C.gray, fontSize: 12, marginTop: 4 }}>奖励倍率 ×{result.mult}</div>
          </Card>
        )}

        <Card style={{ marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🐉</div>
            <div style={{ color: C.gold, fontSize: 18, marginBottom: 8 }}>书境守护者</div>
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

  // 结算
  if (session.status === 'COMPLETED') {
    const result = session.reasoningResult ? RESULT_LABEL[session.reasoningResult] : null;
    const mult = result?.mult ?? 1.0;
    const correctIdx = session.correctAnswer;
    const minFate = Math.min(myFate, partnerFate);

    return (
      <div style={{ padding: '16px 20px', minHeight: '100vh', background: C.bg }}>
        <Header title="谜局揭晓" />

        <Card style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📜</div>
          <div style={{ color: C.gold, fontSize: 20, marginBottom: 8 }}>书境探索完成</div>

          {/* 推理结果 */}
          {result && (
            <div style={{ background: C.card, borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ color: result.color, fontSize: 18, fontWeight: 700 }}>{result.text}</div>
              <div style={{ color: C.gray, fontSize: 12, marginTop: 4 }}>奖励倍率 ×{mult}</div>
            </div>
          )}

          {/* 正确答案 */}
          {correctIdx >= 0 && session.suspects && (
            <Card style={{ borderLeft: `3px solid ${C.green}`, textAlign: 'left', marginBottom: 12 }}>
              <div style={{ color: C.green, fontSize: 12, marginBottom: 4 }}>真相</div>
              <div style={{ color: C.white, fontSize: 14 }}>{session.suspects[correctIdx]}</div>
            </Card>
          )}

          {/* 缘分值 */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ color: C.gray, fontSize: 12 }}>{myName || '你'}</div>
              <div style={{ color: C.gold, fontSize: 24, fontWeight: 700 }}>{myFate}</div>
            </div>
            <div>
              <div style={{ color: C.gray, fontSize: 12 }}>{partnerName}</div>
              <div style={{ color: C.blue, fontSize: 24, fontWeight: 700 }}>{partnerFate}</div>
            </div>
          </div>

          {minFate > 70 && (
            <div style={{ color: C.gold, fontSize: 14, marginBottom: 12 }}>
              团队默契奖励：额外宝箱 ×1
            </div>
          )}
        </Card>

        {/* 线索回顾 */}
        <div style={{ color: C.gold, fontSize: 14, marginBottom: 8 }}>线索回顾</div>
        {allClues.map(r => (
          <Card key={r.round} style={{ marginBottom: 8 }}>
            <div style={{ color: C.gold, fontSize: 12, marginBottom: 4 }}>
              第{r.round}轮 {r.sameLocation ?
                <span style={{ color: '#ff9800' }}>（同一地点，线索重叠）</span> :
                <span style={{ color: C.green }}>（不同地点，互补线索）</span>}
            </div>
            <div style={{ color: C.white, fontSize: 13 }}>{r.hostClue}</div>
            <div style={{ color: C.gray, fontSize: 13, marginTop: 2 }}>{r.guestClue}</div>
          </Card>
        ))}

        <div style={{ marginTop: 16 }}>
          <Btn text="返回大厅" color={C.gold} onClick={() => setSession(null)} full />
        </div>
      </div>
    );
  }

  return null;
}

// ── 子组件 ──

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
  return <div style={{ background: C.card, borderRadius: 12, padding: 16, ...style }}>{children}</div>;
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

function ClueChip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{
      flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 12, lineHeight: 1.4,
      color, background: `${color}15`, border: `1px solid ${color}30`,
    }}>
      {children}
    </div>
  );
}
