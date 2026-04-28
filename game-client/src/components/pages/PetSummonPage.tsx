import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useGameStore } from '../../store/gameStore';
import { randomPet, type PetData } from '../../services/api';
import shell from './lunhui/LunhuiPages.module.css';
import styles from './PetSummonPage.module.css';
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

const pickPhrase = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

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

  const tierColor = result ? TIER_COLORS[result.tier] || TIER_COLORS[1] : TIER_COLORS[1];
  const tierGlow = result ? TIER_GLOW[result.tier] || TIER_GLOW[1] : 'transparent';
  const tierIsHigh = (result?.tier ?? 0) >= 4;
  const tierIsRare = (result?.tier ?? 0) >= 5;

  const tierVars = useMemo<CSSProperties>(() => ({
    ['--tier-color' as string]: tierColor,
    ['--tier-glow' as string]: tierGlow,
    ['--tier-border' as string]: `${tierColor}60`,
  }), [tierColor, tierGlow]);

  const eggIconStyle: CSSProperties = {
    animation: `petEggShake ${Math.max(0.08, 0.4 - crackStage * 0.06)}s infinite alternate`,
    filter: crackStage >= 3 ? `brightness(1.${crackStage * 2})` : undefined,
    transform: `scale(${1 + crackStage * 0.05})`,
  };

  const eggRingStyle: CSSProperties = {
    opacity: 0.3 + crackStage * 0.15,
    animationDuration: `${Math.max(0.3, 1 - crackStage * 0.15)}s`,
  };

  return (
    <div className={shell.mockPage}>
      <div className={shell.appbar}>
        <div className={shell.appbarRow}>
          <div className={shell.appbarLoc}>
            <span className={shell.appbarBook}>砸 蛋</span>
            <span className={shell.appbarZone}>命运之蛋 · 邂逅伙伴</span>
          </div>
          <div className={shell.appbarIcons}>
            <button className={shell.appbarIcon} onClick={() => navigateTo('pet')} type="button" aria-label="宠物">宠</button>
            <button className={shell.appbarIcon} onClick={() => navigateTo('wheel')} type="button" aria-label="轮盘">盘</button>
          </div>
        </div>
      </div>

      <div className={shell.scrollPlain}>
        {phase === 'idle' && (
          <div className={styles.idle}>
            <div className={styles.eggIdle}>🥚</div>
            <button className={styles.goldBtn} onClick={handleCrack} type="button">✦ 砸 蛋</button>
            <p className={styles.idleHint}>消耗宠物蛋 · 随机获得一只伙伴</p>
            <div className={styles.tierLegend}>
              {TIER_LABELS.map((t, i) => {
                const c = TIER_COLORS[i + 1];
                const tierStyle: CSSProperties = {
                  ['--tier-color' as string]: c,
                  ['--tier-bg' as string]: `${c}20`,
                  ['--tier-border' as string]: `${c}40`,
                };
                return (
                  <span key={t} className={styles.tierBadge} style={tierStyle}>{t}</span>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'cracking' && (
          <div className={styles.cracking}>
            <div className={styles.eggStage}>
              <div
                className={`${styles.eggRing} ${crackStage >= 3 ? styles.eggRingHot : ''}`.trim()}
                style={eggRingStyle}
              />
              {crackStage >= 2 && Array.from({ length: 8 }).map((_, i) => {
                const particleStyle: CSSProperties = {
                  top: `${50 + 45 * Math.sin((i / 8) * Math.PI * 2)}%`,
                  left: `${50 + 45 * Math.cos((i / 8) * Math.PI * 2)}%`,
                  animation: `petEggParticle ${1.5 + i * 0.2}s infinite`,
                  animationDelay: `${i * 0.2}s`,
                };
                return (
                  <div
                    key={i}
                    className={`${styles.eggParticle} ${crackStage >= 4 ? styles.eggParticleHot : ''}`.trim()}
                    style={particleStyle}
                  />
                );
              })}
              <span className={styles.eggIcon} style={eggIconStyle}>
                {crackStage < 4 ? '🥚' : '💥'}
              </span>
              {crackStage >= 1 && (
                <div className={styles.eggSparks}>
                  {'💫'.repeat(Math.min(crackStage, 3))}
                </div>
              )}
            </div>
            <p className={`${styles.crackPhrase} ${crackStage >= 3 ? styles.crackPhraseHot : ''}`.trim()}>
              {phrase}
            </p>
            <div className={styles.crackBar}>
              <div className={styles.crackBarFill} style={{ width: `${(crackStage + 1) * 20}%` }} />
            </div>
          </div>
        )}

        {phase === 'reveal' && (
          <div className={styles.reveal}>
            <span className={styles.revealStar}>✨</span>
          </div>
        )}

        {phase === 'result' && result && (
          <div className={styles.result} style={tierVars}>
            <div className={`${styles.tierBanner} ${tierIsHigh ? styles.tierBannerHigh : ''}`.trim()}>
              {'★'.repeat(result.tier)} {result.tierName} {'★'.repeat(result.tier)}
            </div>
            <div className={`${styles.resultIcon} ${tierIsHigh ? styles.resultIconHigh : ''}`.trim()}>
              {result.icon || '🐾'}
            </div>
            <p className={`${styles.cheer} ${tierIsRare ? styles.cheerHigh : ''}`.trim()}>
              {pickPhrase(TIER_CHEERS[result.tier] || TIER_CHEERS[1])}
            </p>
            <h3 className={styles.resultName}>{result.nickname}</h3>
            <p className={styles.resultMeta}>
              {result.petType} · {result.element || '无属性'} · 可分配 {result.propertyPointNum} 点
            </p>
            <div className={styles.statsBox}>
              {([
                ['体质', result.constitution],
                ['魔力', result.magicPower],
                ['力量', result.power],
                ['耐力', result.endurance],
                ['敏捷', result.agile],
              ] as const).map(([label, val]) => (
                <div key={label} className={styles.statCell}>
                  <div className={styles.statCellLabel}>{label}</div>
                  <div className={styles.statCellValue}>{val}</div>
                </div>
              ))}
            </div>
            <div className={styles.actionRow}>
              <button className={styles.goldBtn} onClick={handleReset} type="button">继 续</button>
              <button className={styles.ghostBtn} onClick={() => navigateTo('pet')} type="button">查 看 宠 物</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes petEggShake {
          0% { transform: rotate(-${shakeIntensity}deg) translateX(-${shakeIntensity}px); }
          100% { transform: rotate(${shakeIntensity}deg) translateX(${shakeIntensity}px); }
        }
      `}</style>
    </div>
  );
}
