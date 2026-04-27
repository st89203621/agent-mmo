import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';

interface Opponent {
  id: string;
  icon: string;
  name: string;
  power: number;
  diff: string;
}

interface Top { rank: number; icon: string; name: string; level: number; dan: string; score: number; winRate: number; reward: string; tone: 'red' | 'gold' | 'azure' }

const DAN_LIST = ['青 铜', '磐 石', '玄 铁', '寒 星', '银 月', '鎏 金', '霸'];
const CURRENT_DAN_IDX = 2;

// TODO: 接入 /arena/match 接口
const OPPONENTS: Opponent[] = [
  { id: 'op1', icon: '枯', name: '血刃·枯骨', power: 3680, diff: '- 3%' },
  { id: 'op2', icon: '冷', name: '夜枭·冷', power: 3820, diff: '+ 2%' },
  { id: 'op3', icon: '落', name: '一剑·落花', power: 3600, diff: '- 5%' },
];

const TOPS: Top[] = [
  { rank: 1, icon: '★1', name: '霜天·狼王', level: 17, dan: '鎏金', score: 2340, winRate: 94, reward: '3200 币', tone: 'red' },
  { rank: 2, icon: '★2', name: '九霄·青衫', level: 14, dan: '银月', score: 2180, winRate: 87, reward: '2000 币', tone: 'gold' },
  { rank: 3, icon: '★3', name: '海盗世家·苏幕', level: 12, dan: '银月', score: 2102, winRate: 82, reward: '1200 币', tone: 'azure' },
];

export default function ArenaPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const myScore = 1460;
  const myWin = 3;
  const myLose = 2;
  const remain = 3;

  const handleChallenge = (op: Opponent) => {
    toast.info(`挑战 ${op.name}`);
    navigateTo('battle', { mode: 'arena', opponentId: op.id });
  };

  const progressW = Math.min(100, (myScore - 1400) / 1.4);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>武 斗</span>
            <span className={styles.appbarZone}>排 名 # 204 · 剩 {remain} 场</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="赏赐" onClick={() => toast.info('段位奖励待实现')}>赏</button>
            <button type="button" className={styles.appbarIcon} aria-label="榜单" onClick={() => navigateTo('ranking')}>榜</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.arHero}>
          <div className={styles.arRk}>当 前 段 位</div>
          <div className={styles.arDan}>{DAN_LIST[CURRENT_DAN_IDX]}</div>
          <div className={styles.arScore}>⚔ {myScore} 分 · {myWin} 胜 {myLose} 败</div>
          <div className={styles.arProg}>
            <span>{DAN_LIST[CURRENT_DAN_IDX]}</span>
            <div className={styles.arProgBar} style={{ ['--w' as string]: `${progressW}%` }} />
            <span>还需 40 分 · {DAN_LIST[CURRENT_DAN_IDX + 1] || '巅 峰'}</span>
          </div>
        </div>

        <div className={styles.arLadder}>
          {DAN_LIST.map((d, i) => (
            <div key={d} className={i === CURRENT_DAN_IDX ? styles.arLadderNow : ''}>
              {d}
            </div>
          ))}
        </div>

        <div className={styles.sectLine}>今 日 对 手 · 推 荐</div>

        {OPPONENTS.map((op) => (
          <div key={op.id} className={styles.arMatch}>
            <div className={styles.arMatchSide}>
              <div className={styles.arMatchAv}>我</div>
              <div className={styles.arMatchNm}>征战·蔷薇</div>
              <div className={styles.arMatchPw}>战力 3,720</div>
            </div>
            <div className={styles.arMatchVs}>
              VS
              <button type="button" className={styles.arMatchGo} onClick={() => handleChallenge(op)}>挑 战</button>
            </div>
            <div className={styles.arMatchSide}>
              <div className={styles.arMatchAv}>{op.icon}</div>
              <div className={styles.arMatchNm}>{op.name}</div>
              <div className={styles.arMatchPw}>战力 {op.power.toLocaleString()} · {op.diff}</div>
            </div>
          </div>
        ))}

        <div className={styles.sectLine}>周 榜 TOP 3</div>

        {TOPS.map((t) => {
          const avCls = t.tone === 'red' ? styles.bkRowAvRed : t.tone === 'gold' ? styles.bkRowAvGold : styles.bkRowAvJade;
          const vCls = t.tone === 'red' ? styles.bkRowVRed : t.tone === 'gold' ? styles.bkRowVGold : styles.bkRowVJade;
          return (
            <div key={t.rank} className={styles.bkRow}>
              <span className={`${styles.bkRowAv} ${avCls}`}>{t.icon}</span>
              <div className={styles.bkRowI}>
                <div className={styles.bkRowT1}>{t.name} · Lv {t.level}</div>
                <div className={styles.bkRowT2}>{t.dan} · {t.score} 分 · 胜率 {t.winRate}%</div>
              </div>
              <span className={`${styles.bkRowV} ${vCls}`}>{t.reward}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
