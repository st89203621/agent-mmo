import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface CoupleStat {
  v: string;
  l: string;
}

// TODO: 接入 /couple/state 接口
const HUSBAND = { name: '凌 川', avText: '凌\n川', level: '元 婴 · 上 阶' };
const WIFE = { name: '苏 倾 月', avText: '苏\n倾\n月', level: '金 丹 · 巅 峰' };

const STATS: CoupleStat[] = [
  { v: '8,420', l: '同 修 进 度' },
  { v: '+ 12%', l: '加 成 攻 防' },
  { v: '7 / 7', l: '功 法 共 鸣' },
];

const ACTS: { key: string; label: string }[] = [
  { key: 'cultivate', label: '双 修 入 定' },
  { key: 'gift', label: '互 赠 灵 物' },
  { key: 'banquet', label: '同 席 共 饮' },
  { key: 'travel', label: '云 游 山 河' },
];

export default function CouplePage() {
  usePageBackground(PAGE_BG.COUPLE);
  const back = useGameStore((s) => s.back);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>夫 妻 合 修</span>
            <span className={styles.appbarZone}>同 心 · 同 命 · 同 道</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => back()}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.cpHero}>
          <div className={styles.cpPair}>
            <div className={styles.cpPairSide}>
              <div className={styles.cpPairAv}>{HUSBAND.avText}</div>
              <div className={`${styles.cpPairNm} ${styles.cpPairNmM}`}>{HUSBAND.name}</div>
              <div className={styles.cpPairLv}>{HUSBAND.level}</div>
            </div>
            <span className={styles.cpHeart}>♡</span>
            <div className={styles.cpPairSide}>
              <div className={styles.cpPairAv}>{WIFE.avText}</div>
              <div className={`${styles.cpPairNm} ${styles.cpPairNmF}`}>{WIFE.name}</div>
              <div className={styles.cpPairLv}>{WIFE.level}</div>
            </div>
          </div>

          <div className={styles.cpStat}>
            {STATS.map((s, i) => (
              <div key={i}>
                <div className={styles.cpStatV}>{s.v}</div>
                <div className={styles.cpStatL}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sectLine}>合 修 玩 法</div>

        <div className={styles.wdAct}>
          {ACTS.map((a) => (
            <button
              key={a.key}
              type="button"
              className={styles.wdActBtn}
              onClick={() => toast.info('该玩法尚在筹备')}
            >
              <span className={styles.wdActBtnI}>{a.label.charAt(0)}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
