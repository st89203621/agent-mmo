import { useState, useEffect, useRef } from 'react';
import {
  createCoexplore, joinCoexplore,
  coexploreExplore, coexploreReason,
  coexploreBoss, leaveCoexplore,
  subscribeCoexplore, subscribeCoexploreLobby,
} from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import type { CoexploreSessionData, CoexploreRoundData } from '../../types';

const C = {
  bg: '#0a0a12', card: 'rgba(255,255,255,0.05)',
  gold: '#e8c44a', goldDim: 'rgba(232,196,74,0.15)',
  green: '#4caf50', red: '#f44336', blue: '#5c9ce6',
  white: '#e0e0e0', gray: '#888', darkGray: '#333',
} as const;

/** 所有阶段共用的根容器样式 — 可滚动 */
const PAGE: React.CSSProperties = {
  padding: '16px 20px', height: '100%', overflowY: 'auto', background: C.bg,
};

const RESULT_LABEL: Record<string, { text: string; color: string; mult: number }> = {
  PERFECT:   { text: '完美破案', color: C.gold, mult: 1.5 },
  CONSENSUS: { text: '心意相通', color: C.green, mult: 1.0 },
  SPLIT:     { text: '各执己见', color: '#ff9800', mult: 0.8 },
  LOST:      { text: '迷失方向', color: C.red, mult: 0.5 },
};

export default function CoexplorePage() {
  const playerId = Number(usePlayerStore(s => s.playerId));
  const bookWorld = useGameStore(s => s.currentBookWorld);

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
    if (!bookWorld) return;
    setLoading(true);
    try {
      setSession(await createCoexplore({
        bookTitle: bookWorld.title,
        bookLoreSummary: bookWorld.loreSummary,
        bookArtStyle: bookWorld.artStyle,
      }));
    } finally { setLoading(false); }
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
  const allClues = (session?.rounds ?? []).filter(r => r.hostClue && r.guestClue);

  // ── 渲染 ──

  // 大厅
  if (!session) {
    const navigateTo = useGameStore.getState().navigateTo;
    return (
      <div style={PAGE}>
        <Header title="共探书境" />

        {/* 当前选中的书 */}
        {bookWorld ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: 12, background: C.goldDim, borderRadius: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.gold, fontSize: 14, fontWeight: 600 }}>{bookWorld.title}</div>
              <div style={{ color: C.gray, fontSize: 12, marginTop: 2 }}>{bookWorld.author} · {bookWorld.category}</div>
            </div>
            <button onClick={() => navigateTo('book-world')}
              style={{ background: 'none', border: `1px solid ${C.gray}`, color: C.gray, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
              换书
            </button>
          </div>
        ) : (
          <div style={{
            padding: 20, marginBottom: 16, background: C.card, borderRadius: 10,
            textAlign: 'center',
          }}>
            <div style={{ color: C.gray, fontSize: 14, marginBottom: 10 }}>请先选择一本书进入书境</div>
            <Btn text="前往书库" color={C.gold} onClick={() => navigateTo('book-world')} />
          </div>
        )}

        <p style={{ color: C.gray, fontSize: 13, marginBottom: 16 }}>
          两人同入书境，分头收集线索，合力推理真相。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn text={loading ? '创建中...' : '创建房间'} color={C.gold} onClick={handleCreate} disabled={loading || !bookWorld} />
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
                style={{ padding: 12, marginBottom: 8, background: C.goldDim, borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: C.gold, fontSize: 14 }}>{s.hostName || '未知'}</span>
                  <span style={{ color: C.gray, fontSize: 12, marginLeft: 8 }}>#{s.sessionId}</span>
                </div>
                {s.bookTitle && <span style={{ color: C.gray, fontSize: 11 }}>{s.bookTitle}</span>}
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
      <div style={PAGE}>
        <Header title="等待同伴" onBack={handleLeave} />
        {session.bookTitle && (
          <div style={{ color: C.gray, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
            书境：<span style={{ color: C.gold }}>{session.bookTitle}</span>
          </div>
        )}
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.gold, fontSize: 18, marginBottom: 12 }}>房间号</div>
            <div style={{ color: '#fff', fontSize: 28, fontFamily: 'monospace', letterSpacing: 4, marginBottom: 16 }}>
              {session.sessionId}
            </div>
            <div style={{ color: C.gray, fontSize: 13 }}>将此房间号分享给好友，等待加入...</div>
            <Pulse />
          </div>
        </Card>
      </div>
    );
  }

  // 探索阶段
  if (session.status === 'EXPLORING') {
    const alreadyChosen = !!myChoice;
    return (
      <div style={PAGE}>
        <Header title={`第${session.currentRound}轮 · 探索`} onBack={handleLeave} />
        <FateBar myFate={myFate} partnerFate={partnerFate} myName={myName} partnerName={partnerName} />

        {/* 谜题场景图 + 文字 */}
        <MysteryBanner imageUrl={session.mysteryImageUrl} text={session.mysteryBackground} />

        {/* 已收集线索 */}
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
              <div style={{ color: C.gray, fontSize: 12, marginTop: 8 }}>选不同地点 = 互补线索 + 缘分 +15</div>
              <Pulse />
            </div>
          </Card>
        ) : (
          <>
            <div style={{ color: C.gray, fontSize: 12, marginBottom: 10 }}>选择探索地点</div>
            {/* 2x2 地点图片卡片网格 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {session.locations.map(loc => {
                const selected = selectedLoc === loc.id;
                return (
                  <div key={loc.id} onClick={() => setSelectedLoc(loc.id)}
                    style={{
                      position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                      border: selected ? `2px solid ${C.gold}` : '2px solid transparent',
                      boxShadow: selected ? `0 0 12px ${C.gold}40` : 'none',
                      transition: 'all 0.2s',
                    }}>
                    <SceneImg url={loc.imageUrl} alt={loc.name} height={140} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                      padding: '24px 10px 10px',
                    }}>
                      <div style={{ color: selected ? C.gold : '#fff', fontSize: 15, fontWeight: 700 }}>{loc.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2, lineHeight: 1.3,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>{loc.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14 }}>
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
        <div style={{ height: 20 }} />
      </div>
    );
  }

  // 推理阶段
  if (session.status === 'REASONING') {
    const iAnswered = myAnswer >= 0;
    return (
      <div style={PAGE}>
        <Header title="推理 · 定论" onBack={handleLeave} />
        <FateBar myFate={myFate} partnerFate={partnerFate} myName={myName} partnerName={partnerName} />

        <MysteryBanner imageUrl={session.mysteryImageUrl} text={session.mysteryBackground} />

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

        {iAnswered ? (
          <Card>
            <div style={{ textAlign: 'center', color: C.gray }}>
              <div>你已提交推理，等待 <span style={{ color: C.gold }}>{partnerName}</span>...</div>
              {!partnerAnswered && <Pulse />}
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
          </>
        )}
        <div style={{ height: 20 }} />
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
      <div style={PAGE}>
        <Header title="终局 · 讨伐" />
        <FateBar myFate={myFate} partnerFate={partnerFate} myName={myName} partnerName={partnerName} />

        {result && (
          <Card style={{ marginBottom: 12, textAlign: 'center', borderLeft: `3px solid ${result.color}` }}>
            <div style={{ color: result.color, fontSize: 16, fontWeight: 700 }}>{result.text}</div>
            <div style={{ color: C.gray, fontSize: 12, marginTop: 4 }}>奖励倍率 x{result.mult}</div>
          </Card>
        )}

        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <SceneImg url={session.mysteryImageUrl} alt="书境守护者" height={180} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}>
            <div style={{ color: C.gold, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>书境守护者</div>
            <div style={{ width: '70%', background: C.darkGray, borderRadius: 8, height: 16, overflow: 'hidden' }}>
              <div style={{
                width: `${hpPercent}%`, height: '100%', borderRadius: 8,
                background: hpPercent > 50 ? C.red : hpPercent > 20 ? '#ff9800' : '#f44336',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ color: C.gray, fontSize: 12, marginTop: 6 }}>
              HP: {Math.max(0, session.bossHp - totalDamage)} / {session.bossHp}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Card style={{ flex: 1 }}>
            <div style={{ color: C.gold, fontSize: 12 }}>你的伤害</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{myDamage}</div>
          </Card>
          <Card style={{ flex: 1 }}>
            <div style={{ color: C.blue, fontSize: 12 }}>{partnerName} 伤害</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{partnerDamage}</div>
          </Card>
        </div>

        <Btn text={attacking ? '攻击中...' : '发动攻击'} color={C.red} onClick={handleBossAttack} disabled={attacking} full />
      </div>
    );
  }

  // 结算
  if (session.status === 'COMPLETED') {
    const result = session.reasoningResult ? RESULT_LABEL[session.reasoningResult] : null;
    const correctIdx = session.correctAnswer;
    const minFate = Math.min(myFate, partnerFate);

    return (
      <div style={PAGE}>
        <Header title="谜局揭晓" />

        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <SceneImg url={session.mysteryImageUrl} alt="书境探索完成" height={160} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.8))',
          }}>
            <div style={{ color: C.gold, fontSize: 22, fontWeight: 700 }}>书境探索完成</div>
            {result && (
              <div style={{ color: result.color, fontSize: 16, fontWeight: 700, marginTop: 6 }}>
                {result.text} x{result.mult}
              </div>
            )}
          </div>
        </div>

        {correctIdx >= 0 && session.suspects && (
          <Card style={{ borderLeft: `3px solid ${C.green}`, marginBottom: 12 }}>
            <div style={{ color: C.green, fontSize: 12, marginBottom: 4 }}>真相</div>
            <div style={{ color: C.white, fontSize: 14 }}>{session.suspects[correctIdx]}</div>
          </Card>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Card style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: C.gray, fontSize: 12 }}>{myName || '你'}</div>
            <div style={{ color: C.gold, fontSize: 24, fontWeight: 700 }}>{myFate}</div>
          </Card>
          <Card style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: C.gray, fontSize: 12 }}>{partnerName}</div>
            <div style={{ color: C.blue, fontSize: 24, fontWeight: 700 }}>{partnerFate}</div>
          </Card>
        </div>

        {minFate > 70 && (
          <div style={{ textAlign: 'center', color: C.gold, fontSize: 14, marginBottom: 12 }}>
            团队默契奖励：额外宝箱 x1
          </div>
        )}

        <div style={{ color: C.gold, fontSize: 14, marginBottom: 8 }}>线索回顾</div>
        {allClues.map(r => (
          <Card key={r.round} style={{ marginBottom: 8 }}>
            <div style={{ color: C.gray, fontSize: 11, marginBottom: 6 }}>第{r.round}轮 {r.sameLocation ?
              <span style={{ color: '#ff9800' }}>（同一地点）</span> :
              <span style={{ color: C.green }}>（不同地点）</span>}
            </div>
            <div style={{ color: C.white, fontSize: 13 }}>{r.hostClue}</div>
            <div style={{ color: C.gray, fontSize: 13, marginTop: 2 }}>{r.guestClue}</div>
          </Card>
        ))}

        <div style={{ marginTop: 16, paddingBottom: 20 }}>
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

function Pulse() {
  return <div style={{ marginTop: 16, color: C.gold, fontSize: 20, letterSpacing: 4, textAlign: 'center' }}>···</div>;
}

function MysteryBanner({ imageUrl, text }: { imageUrl: string | null; text: string }) {
  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <SceneImg url={imageUrl} alt="谜题" height={150} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
        padding: '32px 14px 12px',
      }}>
        <div style={{ color: C.gold, fontSize: 12, marginBottom: 4 }}>谜题</div>
        <div style={{ color: C.white, fontSize: 13, lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}

function SceneImg({ url, alt, height }: { url: string | null; alt: string; height: number }) {
  if (!url) {
    return (
      <div style={{
        width: '100%', height,
        background: 'linear-gradient(110deg, #1a1a2e 30%, #16213e 50%, #1a1a2e 70%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <span style={{ color: C.gray, fontSize: 12 }}>场景生成中...</span>
      </div>
    );
  }
  return (
    <img src={url} alt={alt}
      style={{ width: '100%', height, objectFit: 'cover', display: 'block' }} />
  );
}
