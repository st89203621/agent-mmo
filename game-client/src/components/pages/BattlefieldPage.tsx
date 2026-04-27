import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface RankRow {
  rk: number;
  nm: string;
  k: number;
  d: number;
  side: 'red' | 'azure';
}

// TODO: 接入 /battlefield/score 与 /battlefield/join 接口
const STATE = {
  scoreRed: 1820,
  scoreAzure: 1665,
  remain: '14 : 36',
};

const RANKING: RankRow[] = [
  { rk: 1, nm: '陆 长 渊', k: 18, d: 4, side: 'red' },
  { rk: 2, nm: '司 空 雪', k: 16, d: 5, side: 'azure' },
  { rk: 3, nm: '凌 川', k: 14, d: 6, side: 'red' },
  { rk: 4, nm: '苏 倾 月', k: 13, d: 4, side: 'azure' },
  { rk: 5, nm: '萧 引 之', k: 11, d: 7, side: 'red' },
  { rk: 6, nm: '裴 无 涯', k: 9, d: 5, side: 'azure' },
];

export default function BattlefieldPage() {
  usePageBackground(PAGE_BG.BATTLEFIELD);
  const back = useGameStore((s) => s.back);

  const handleJoin = () => {
    toast.info('请 战 已 提 交 · 排 队 中 ...');
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>争 霸 战 场</span>
            <span className={styles.appbarZone}>朱 雀 vs 玄 武 · 跨 服 国 战</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => back()}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.bfHero}>
          <div className={styles.bfHeroFlag}>战</div>
          <div className={styles.bfHeroT}>九 州 鼎 鼐</div>
          <div className={styles.bfHeroS}>每 周 寅 末 开 战 · 三 时 辰 见 胜 负</div>
        </div>

        <div className={styles.bfTeams}>
          <div className={styles.bfTeam}>
            <div className={`${styles.bfTeamFlag} ${styles.bfTeamFlagRed}`}>朱</div>
            <div className={styles.bfTeamNm}>朱 雀 同 盟</div>
            <div className={`${styles.bfTeamSc} ${styles.bfTeamScRed}`}>{STATE.scoreRed}</div>
          </div>
          <span className={styles.bfVs}>vs</span>
          <div className={styles.bfTeam}>
            <div className={`${styles.bfTeamFlag} ${styles.bfTeamFlagAzure}`}>玄</div>
            <div className={styles.bfTeamNm}>玄 武 同 盟</div>
            <div className={`${styles.bfTeamSc} ${styles.bfTeamScAzure}`}>{STATE.scoreAzure}</div>
          </div>
        </div>

        <div className={styles.bfTimer}>剩 余 {STATE.remain}</div>

        <div className={styles.sectLine}>当 前 战 报 · 前 六 名</div>

        {RANKING.map((r) => (
          <div key={r.rk} className={styles.bfRow}>
            <span className={styles.bfRowRk}>#{r.rk}</span>
            <span className={styles.bfRowNm}>{r.nm}</span>
            <span className={styles.bfRowK}>K {r.k}</span>
            <span className={styles.bfRowD}>D {r.d}</span>
          </div>
        ))}

        <button type="button" className={styles.bfJoin} onClick={handleJoin}>
          请 战
        </button>
      </div>
    </div>
  );
}
