import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { randomPet, type PetData } from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const TIER_COLORS: Record<number, string> = {
  1: '#aaa', 2: '#5cb85c', 3: '#3498db', 4: '#a855f7', 5: '#f59e0b', 6: '#ef4444',
};
const TIER_GLOW: Record<number, string> = {
  1: 'rgba(170,170,170,0.3)', 2: 'rgba(92,184,92,0.4)', 3: 'rgba(52,152,219,0.5)',
  4: 'rgba(168,85,247,0.5)', 5: 'rgba(245,158,11,0.6)', 6: 'rgba(239,68,68,0.7)',
};

const CRACK_PHRASES = [
  ['蛋壳微微颤动...', '有动静了...', '似乎有什么在孵化...'],
  ['裂缝出现了！', '蛋壳裂开了！', '光芒从裂缝中透出！'],
  ['单车变摩托！', '越来越亮了！', '不得了！'],
  ['要起飞了！', '血赚不亏！', '这波稳了！'],
  ['哦吼！不简单啊！', '天降神宠！', '这下发了！'],
];

const TIER_CHEERS: Record<number, string[]> = {
  1: ['聊胜于无~', '也是个伴儿', '千里之行始于足下'],
  2: ['还不错哦！', '小有所得', '潜力股！'],
  3: ['运气不错！', '精品到手！', '这可以！'],
  4: ['稀有降临！', '今天是欧皇吗？', '赚到了！'],
  5: ['史诗巨兽！', '逆天改命！', '直接起飞！'],
  6: ['传说召唤！！！', '一夜暴富！', '天选之人！！！'],
};

const TIER_LABELS = ['普通 35%', '优秀 28%', '精良 20%', '稀有 11%', '史诗 5%', '传说 1%'] as const;

type Phase = 'idle' | 'cracking' | 'reveal' | 'result';

const GOLD_BTN: React.CSSProperties = {
  padding: '14px 40px',
  background: 'linear-gradient(90deg, var(--accent-red), var(--accent-gold))',
  border: 0,
  color: 'var(--text)',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: 6,
  cursor: 'pointer',
  fontFamily: 'var(--font-serif)',
};

const GHOST_BTN: React.CSSProperties = {
  padding: '10px 24px',
  background: 'transparent',
  border: '1px solid var(--border-gold)',
  color: 'var(--accent-gold)',
  fontSize: 12,
  letterSpacing: 3,
  cursor: 'pointer',
  fontFamily: 'var(--font-serif)',
};

export default function PetSummonPage() {
  usePageBackground(PAGE_BG.PET_SUMMON);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<PetData | null>(null);
  const [crackStage, setCrackStage] = useState(0);
  const [phrase, setPhrase] = useState('');
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const resultRef = useRef<PetData | null>(null);

  const pickPhrase = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const handleCrack = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('cracking');
    setCrackStage(0);
    setShakeIntensity(1);
    setPhrase(pickPhrase(CRACK_PHRASES[0]));

    const petPromise = randomPet();

    timerRef.current = setTimeout(() => {
      setCrackStage(1); setShakeIntensity(2); setPhrase(pickPhrase(CRACK_PHRASES[1]));
      timerRef.current = setTimeout(() => {
        setCrackStage(2); setShakeIntensity(4); setPhrase(pickPhrase(CRACK_PHRASES[2]));
        timerRef.current = setTimeout(() => {
          setCrackStage(3); setShakeIntensity(6); setPhrase(pickPhrase(CRACK_PHRASES[3]));
          timerRef.current = setTimeout(async () => {
            setCrackStage(4); setShakeIntensity(8); setPhrase(pickPhrase(CRACK_PHRASES[4]));
            try {
              const res = await petPromise;
              resultRef.current = res.pet;
              timerRef.current = setTimeout(() => {
                setPhase('reveal');
                timerRef.current = setTimeout(() => {
                  setResult(resultRef.current);
                  setPhase('result');
                }, 1200);
              }, 600);
            } catch {
              setPhase('idle');
            }
          }, 700);
        }, 700);
      }, 800);
    }, 900);
  }, [phase]);

  const handleReset = () => {
    cleanup();
    setPhase('idle');
    setResult(null);
    setCrackStage(0);
    setShakeIntensity(0);
    setPhrase('');
  };

  const tierColor = result ? TIER_COLORS[result.tier] || TIER_COLORS[1] : '#aaa';
  const tierGlow = result ? TIER_GLOW[result.tier] || TIER_GLOW[1] : 'transparent';

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>砸 蛋</span>
            <span className={styles.appbarZone}>命运之蛋 · 邂逅伙伴</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('pet')} type="button" aria-label="宠物">宠</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('wheel')} type="button" aria-label="轮盘">盘</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        {phase === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 20 }}>
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              border: '3px dashed var(--border-gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 64, animation: 'petEggPulse 2s infinite',
            }}>
              🥚
            </div>
            <button style={GOLD_BTN} onClick={handleCrack} type="button">✦ 砸 蛋</button>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 2 }}>消耗宠物蛋 · 随机获得一只伙伴</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8, padding: '0 14px' }}>
              {TIER_LABELS.map((t, i) => (
                <span key={i} style={{
                  fontSize: 10, padding: '2px 8px',
                  background: `${TIER_COLORS[i + 1]}20`, color: TIER_COLORS[i + 1],
                  border: `1px solid ${TIER_COLORS[i + 1]}40`, letterSpacing: 1, fontFamily: 'var(--font-mono)',
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {phase === 'cracking' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 16 }}>
            <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                position: 'absolute', inset: -20, borderRadius: '50%',
                border: `3px solid ${crackStage >= 3 ? 'var(--accent-gold)' : 'var(--border-gold)'}`,
                opacity: 0.3 + crackStage * 0.15,
                animation: `petEggPulse ${Math.max(0.3, 1 - crackStage * 0.15)}s infinite`,
              }} />
              {crackStage >= 2 && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 4, height: 4, borderRadius: '50%',
                  background: crackStage >= 4 ? 'var(--accent-gold)' : 'var(--border-gold)',
                  animation: `petEggParticle ${1.5 + i * 0.2}s infinite`,
                  animationDelay: `${i * 0.2}s`,
                  top: `${50 + 45 * Math.sin((i / 8) * Math.PI * 2)}%`,
                  left: `${50 + 45 * Math.cos((i / 8) * Math.PI * 2)}%`,
                }} />
              ))}
              <span style={{
                fontSize: 72,
                animation: `petEggShake ${Math.max(0.08, 0.4 - crackStage * 0.06)}s infinite alternate`,
                filter: crackStage >= 3 ? `brightness(1.${crackStage * 2})` : undefined,
                transform: `scale(${1 + crackStage * 0.05})`,
                transition: 'transform 0.3s',
              }}>
                {crackStage < 4 ? '🥚' : '💥'}
              </span>
              {crackStage >= 1 && (
                <div style={{ position: 'absolute', bottom: -4, right: 20, fontSize: 20, opacity: 0.7 }}>
                  {'💫'.repeat(Math.min(crackStage, 3))}
                </div>
              )}
            </div>
            <p style={{
              fontSize: crackStage >= 3 ? 18 : 15,
              fontWeight: crackStage >= 3 ? 700 : 500,
              color: crackStage >= 3 ? 'var(--accent-gold)' : 'var(--text)',
              fontFamily: 'var(--font-serif)', letterSpacing: 2,
              transition: 'all 0.3s',
              animation: crackStage >= 3 ? 'petPhraseGlow 0.5s infinite alternate' : undefined,
            }}>
              {phrase}
            </p>
            <div style={{ width: '60%', height: 6, background: 'var(--bg-ink)', border: '1px solid var(--border)' }}>
              <div style={{
                width: `${(crackStage + 1) * 20}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--accent-orange), var(--accent-gold))',
                transition: 'width 0.5s ease-out',
              }} />
            </div>
          </div>
        )}

        {phase === 'reveal' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, animation: 'petRevealFlash 1.2s ease-out' }}>
            <span style={{ fontSize: 80, animation: 'petRevealSpin 1s ease-out' }}>✨</span>
          </div>
        )}

        {phase === 'result' && result && (
          <div style={{ textAlign: 'center', padding: '16px 0', animation: 'petResultSlide 0.6s ease-out' }}>
            <div style={{
              padding: '8px 0', marginBottom: 16,
              fontSize: 13, fontWeight: 700, letterSpacing: 3,
              color: tierColor,
              animation: result.tier >= 4 ? 'petTierPulse 1.5s infinite' : undefined,
            }}>
              {'★'.repeat(result.tier)} {result.tierName} {'★'.repeat(result.tier)}
            </div>
            <div style={{
              width: 120, height: 120, margin: '0 auto 12px', borderRadius: '50%',
              border: `3px solid ${tierColor}`,
              background: `radial-gradient(circle, ${tierGlow}, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 56,
              boxShadow: result.tier >= 4 ? `0 0 30px ${tierGlow}` : undefined,
            }}>
              {result.icon || '🐾'}
            </div>
            <p style={{
              fontSize: result.tier >= 5 ? 18 : 15,
              fontWeight: 700, color: tierColor,
              fontFamily: 'var(--font-serif)', letterSpacing: 2, marginBottom: 4,
            }}>
              {pickPhrase(TIER_CHEERS[result.tier] || TIER_CHEERS[1])}
            </p>
            <h3 style={{
              fontSize: 22, color: tierColor,
              fontFamily: 'var(--font-serif)', marginBottom: 4, letterSpacing: 3,
            }}>
              {result.nickname}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
              {result.petType} · {result.element || '无属性'} · 可分配 {result.propertyPointNum} 点
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8, padding: 16, margin: '0 14px', background: 'var(--bg-panel)',
              border: `1px solid ${tierColor}60`,
            }}>
              {([
                ['体质', result.constitution],
                ['魔力', result.magicPower],
                ['力量', result.power],
                ['耐力', result.endurance],
                ['敏捷', result.agile],
              ] as const).map(([label, val]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 18, color: tierColor, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <button style={GOLD_BTN} onClick={handleReset} type="button">继 续</button>
              <button style={GHOST_BTN} onClick={() => navigateTo('pet')} type="button">查 看 宠 物</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes petEggPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes petEggShake {
          0% { transform: rotate(-${shakeIntensity}deg) translateX(-${shakeIntensity}px); }
          100% { transform: rotate(${shakeIntensity}deg) translateX(${shakeIntensity}px); }
        }
        @keyframes petEggParticle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes petPhraseGlow {
          from { text-shadow: 0 0 8px var(--border-gold); }
          to { text-shadow: 0 0 20px var(--accent-gold); }
        }
        @keyframes petRevealFlash {
          0% { opacity: 1; background: rgba(255,255,255,0.6); }
          40% { opacity: 0.9; }
          100% { opacity: 1; background: transparent; }
        }
        @keyframes petRevealSpin {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(360deg); opacity: 1; }
          100% { transform: scale(1) rotate(360deg); opacity: 1; }
        }
        @keyframes petResultSlide {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes petTierPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; text-shadow: 0 0 12px currentColor; }
        }
      `}</style>
    </div>
  );
}
