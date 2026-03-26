import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { randomPet, type PetData } from '../../services/api';
import styles from './PageSkeleton.module.css';

const TIER_COLORS: Record<number, string> = {
  1: '#aaa', 2: '#5cb85c', 3: '#3498db', 4: '#a855f7', 5: '#f59e0b', 6: '#ef4444',
};
const TIER_GLOW: Record<number, string> = {
  1: 'rgba(170,170,170,0.3)', 2: 'rgba(92,184,92,0.4)', 3: 'rgba(52,152,219,0.5)',
  4: 'rgba(168,85,247,0.5)', 5: 'rgba(245,158,11,0.6)', 6: 'rgba(239,68,68,0.7)',
};

// 砸蛋过程中的鼓励语 - 按阶段递进
const CRACK_PHRASES = [
  ['蛋壳微微颤动...', '有动静了...', '似乎有什么在孵化...'],
  ['裂缝出现了！', '蛋壳裂开了！', '光芒从裂缝中透出！'],
  ['单车变摩托！', '越来越亮了！', '不得了！'],
  ['要起飞了！', '血赚不亏！', '这波稳了！'],
  ['哦吼！不简单啊！', '天降神宠！', '这下发了！'],
];

// 高档次专属欢呼语
const TIER_CHEERS: Record<number, string[]> = {
  1: ['聊胜于无~', '也是个伴儿', '千里之行始于足下'],
  2: ['还不错哦！', '小有所得', '潜力股！'],
  3: ['运气不错！', '精品到手！', '这可以！'],
  4: ['稀有降临！', '今天是欧皇吗？', '赚到了！'],
  5: ['史诗巨兽！', '逆天改命！', '直接起飞！'],
  6: ['传说召唤！！！', '一夜暴富！', '天选之人！！！'],
};

type Phase = 'idle' | 'cracking' | 'reveal' | 'result';

export default function PetSummonPage() {
  const { navigateTo } = useGameStore();
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

  const handleCrack = useCallback(async () => {
    if (phase !== 'idle') return;
    setPhase('cracking');
    setCrackStage(0);
    setShakeIntensity(1);
    setPhrase(pickPhrase(CRACK_PHRASES[0]));

    // 同时发请求
    const petPromise = randomPet();

    // 阶段1 → 2
    timerRef.current = setTimeout(() => {
      setCrackStage(1);
      setShakeIntensity(2);
      setPhrase(pickPhrase(CRACK_PHRASES[1]));

      // 阶段2 → 3
      timerRef.current = setTimeout(() => {
        setCrackStage(2);
        setShakeIntensity(4);
        setPhrase(pickPhrase(CRACK_PHRASES[2]));

        // 阶段3 → 4
        timerRef.current = setTimeout(() => {
          setCrackStage(3);
          setShakeIntensity(6);
          setPhrase(pickPhrase(CRACK_PHRASES[3]));

          // 阶段4 → 揭晓
          timerRef.current = setTimeout(async () => {
            setCrackStage(4);
            setShakeIntensity(8);
            setPhrase(pickPhrase(CRACK_PHRASES[4]));

            try {
              const res = await petPromise;
              resultRef.current = res.pet;
              // 短暂白屏揭晓
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
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>宠物砸蛋</h2>
        <p className={styles.subtitle}>砸开命运之蛋，邂逅你的伙伴</p>
      </div>
      <div className={styles.scrollArea}>

        {/* === 待机状态 === */}
        {phase === 'idle' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '40px 0', gap: 20,
          }}>
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              border: '3px dashed var(--gold-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 64, animation: 'pulse 2s infinite',
            }}>
              🥚
            </div>
            <button className={styles.primaryBtn} style={{ padding: '14px 40px', fontSize: 16 }} onClick={handleCrack}>
              砸蛋！
            </button>
            <p className={styles.hint}>消耗宠物蛋，随机获得一只宠物</p>
            {/* 概率提示 */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8,
            }}>
              {(['普通 35%', '优秀 28%', '精良 20%', '稀有 11%', '史诗 5%', '传说 1%'] as const).map((t, i) => (
                <span key={i} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 999,
                  background: `${TIER_COLORS[i + 1]}20`, color: TIER_COLORS[i + 1],
                  border: `1px solid ${TIER_COLORS[i + 1]}40`,
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* === 砸蛋过程 === */}
        {phase === 'cracking' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '32px 0', gap: 16,
          }}>
            {/* 蛋 + 震动 + 裂纹 */}
            <div style={{
              position: 'relative', width: 160, height: 160,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* 光圈脉冲 */}
              <div style={{
                position: 'absolute', inset: -20, borderRadius: '50%',
                border: `3px solid ${crackStage >= 3 ? 'var(--gold)' : 'var(--gold-dim)'}`,
                opacity: 0.3 + crackStage * 0.15,
                animation: `pulse ${Math.max(0.3, 1 - crackStage * 0.15)}s infinite`,
              }} />
              {/* 外圈粒子 */}
              {crackStage >= 2 && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 4, height: 4, borderRadius: '50%',
                  background: crackStage >= 4 ? 'var(--gold)' : 'var(--gold-dim)',
                  animation: `floatParticle ${1.5 + i * 0.2}s infinite`,
                  animationDelay: `${i * 0.2}s`,
                  top: `${50 + 45 * Math.sin((i / 8) * Math.PI * 2)}%`,
                  left: `${50 + 45 * Math.cos((i / 8) * Math.PI * 2)}%`,
                }} />
              ))}
              {/* 蛋体 */}
              <span style={{
                fontSize: 72,
                animation: `eggShake ${Math.max(0.08, 0.4 - crackStage * 0.06)}s infinite alternate`,
                filter: crackStage >= 3 ? `brightness(1.${crackStage * 2})` : undefined,
                transform: `scale(${1 + crackStage * 0.05})`,
                transition: 'transform 0.3s',
              }}>
                {crackStage < 4 ? '🥚' : '💥'}
              </span>
              {/* 裂纹数字标记 */}
              {crackStage >= 1 && (
                <div style={{
                  position: 'absolute', bottom: -4, right: 20,
                  fontSize: 20, opacity: 0.7,
                }}>
                  {'💫'.repeat(Math.min(crackStage, 3))}
                </div>
              )}
            </div>

            {/* 鼓励语 */}
            <p style={{
              fontSize: crackStage >= 3 ? 18 : 15,
              fontWeight: crackStage >= 3 ? 700 : 500,
              color: crackStage >= 3 ? 'var(--gold)' : 'var(--ink)',
              fontFamily: 'var(--font-main)',
              transition: 'all 0.3s',
              animation: crackStage >= 3 ? 'phraseGlow 0.5s infinite alternate' : undefined,
            }}>
              {phrase}
            </p>

            {/* 进度条 */}
            <div style={{
              width: '60%', height: 6, background: 'var(--paper-darker)',
              borderRadius: 3, overflow: 'hidden',
            }}>
              <div style={{
                width: `${(crackStage + 1) * 20}%`, height: '100%',
                background: `linear-gradient(90deg, var(--gold-dim), var(--gold))`,
                transition: 'width 0.5s ease-out',
                borderRadius: 3,
              }} />
            </div>
          </div>
        )}

        {/* === 揭晓闪白 === */}
        {phase === 'reveal' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 300,
            animation: 'revealFlash 1.2s ease-out',
          }}>
            <span style={{
              fontSize: 80,
              animation: 'revealSpin 1s ease-out',
            }}>
              ✨
            </span>
          </div>
        )}

        {/* === 结果展示 === */}
        {phase === 'result' && result && (
          <div style={{
            textAlign: 'center', padding: '16px 0',
            animation: 'resultSlideIn 0.6s ease-out',
          }}>
            {/* 档次横幅 */}
            <div style={{
              padding: '8px 0', marginBottom: 16,
              fontSize: 13, fontWeight: 700, letterSpacing: 2,
              color: tierColor,
              animation: result.tier >= 4 ? 'tierPulse 1.5s infinite' : undefined,
            }}>
              {'★'.repeat(result.tier)} {result.tierName} {'★'.repeat(result.tier)}
            </div>

            {/* 宠物图标 */}
            <div style={{
              width: 120, height: 120, margin: '0 auto 12px',
              borderRadius: '50%',
              border: `3px solid ${tierColor}`,
              background: `radial-gradient(circle, ${tierGlow}, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 56,
              boxShadow: result.tier >= 4 ? `0 0 30px ${tierGlow}` : undefined,
            }}>
              {result.icon || '🐾'}
            </div>

            {/* 欢呼语 */}
            <p style={{
              fontSize: result.tier >= 5 ? 18 : 15,
              fontWeight: 700, color: tierColor,
              fontFamily: 'var(--font-main)',
              marginBottom: 4,
            }}>
              {pickPhrase(TIER_CHEERS[result.tier] || TIER_CHEERS[1])}
            </p>

            {/* 名称 */}
            <h3 style={{
              fontSize: 22, color: tierColor,
              fontFamily: 'var(--font-main)', marginBottom: 4,
            }}>
              {result.nickname}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--ink)', opacity: 0.6, marginBottom: 16 }}>
              {result.petType} · {result.element || '无属性'} · 可分配 {result.propertyPointNum} 点
            </p>

            {/* 属性展示 */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8, padding: 16, background: 'var(--paper-dark)',
              borderRadius: 'var(--radius-md)', marginBottom: 20,
              border: `1px solid ${tierColor}30`,
            }}>
              {([
                ['体质', result.constitution],
                ['魔力', result.magicPower],
                ['力量', result.power],
                ['耐力', result.endurance],
                ['敏捷', result.agile],
              ] as const).map(([label, val]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink)', opacity: 0.5 }}>{label}</div>
                  <div style={{ fontSize: 18, color: tierColor, fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className={styles.actionBtn} onClick={handleReset}>
                继续砸蛋
              </button>
              <button className={styles.actionBtn}
                style={{ background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)' }}
                onClick={() => navigateTo('pet')}>
                查看宠物
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 内联动画关键帧 */}
      <style>{`
        @keyframes eggShake {
          0% { transform: rotate(-${shakeIntensity}deg) translateX(-${shakeIntensity}px); }
          100% { transform: rotate(${shakeIntensity}deg) translateX(${shakeIntensity}px); }
        }
        @keyframes floatParticle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes phraseGlow {
          from { text-shadow: 0 0 8px var(--gold-dim); }
          to { text-shadow: 0 0 20px var(--gold); }
        }
        @keyframes revealFlash {
          0% { background: #fff; opacity: 1; }
          40% { background: #fff; opacity: 0.9; }
          100% { background: transparent; opacity: 1; }
        }
        @keyframes revealSpin {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(360deg); opacity: 1; }
          100% { transform: scale(1) rotate(360deg); opacity: 1; }
        }
        @keyframes resultSlideIn {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes tierPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; text-shadow: 0 0 12px currentColor; }
        }
      `}</style>
    </div>
  );
}
