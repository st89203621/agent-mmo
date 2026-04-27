import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import styles from './lunhui/LunhuiPages.module.css';

interface PkResultParams {
  victory?: boolean;
  enemyName?: string;
  enemyLevel?: number;
  enemyProf?: string;
  myHp?: number;
  myMaxHp?: number;
  reputation?: number;
  killValue?: number;
  loot?: string;
  hatred?: number;
  insight?: string;
}

export default function PkResultPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const playerName = usePlayerStore((s) => s.playerName);
  const params = useGameStore((s) => s.pageParams) as PkResultParams;

  const victory = params.victory ?? true;
  const enemyName = params.enemyName || '夜 刀 无 情';
  const enemyLevel = params.enemyLevel ?? 13;
  const enemyProf = params.enemyProf || '攻';
  const myHp = params.myHp ?? 320;
  const myMaxHp = params.myMaxHp ?? 594;
  const reputation = params.reputation ?? 80;
  const killValue = params.killValue ?? 1;
  const loot = params.loot || '游 戏 币 × 420';
  const hatred = params.hatred ?? 100;
  const insight = params.insight || '第 4 回合您触发 破风 · 穿甲 30% · 造成 403 伤害 · 决胜一击。对方未能在怒气满时释放大招 · 是翻盘关键。';

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>追 杀 · 结 果</span>
            <span className={styles.appbarZone}>PVP · 单 挑</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="历史" onClick={() => navigateTo('messages')}>史</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.endDim} style={{ flex: 'none', padding: '14px' }}>
          <div className={styles.endCard} style={{ padding: '18px' }}>
            <div className={`${styles.endHd} ${victory ? '' : styles.endHdLose}`}>{victory ? '胜' : '败'}</div>
            <div className={styles.endSub}>
              {victory ? 'V I C T O R Y · 血 仇 已 报' : 'D E F E A T · 待 复 仇'}
            </div>
          </div>
        </div>

        <div className={styles.pkDuel}>
          <div className={styles.pkSide}>
            <div className={styles.pkPf}>我</div>
            <div className={styles.pkNm}>{playerName || '征 战 · 蔷 薇'}</div>
            <div className={styles.pkLv}>HP {myHp} / {myMaxHp}</div>
          </div>
          <div className={styles.pkVs}>⚔</div>
          <div className={`${styles.pkSide} ${victory ? styles.pkSideLose : ''}`.trim()}>
            <div className={styles.pkPf}>敌</div>
            <div className={styles.pkNm}>{enemyName}</div>
            <div className={styles.pkLv}>Lv {enemyLevel} · {enemyProf} · {victory ? '击 杀' : '我 方 阵 亡'}</div>
          </div>
        </div>

        <div className={styles.pkPenalty}>
          <div className={styles.pkPenaltyK}>
            {victory ? '战 利 品 · 胜 方 所 得' : '损 失 · 败 方 承 担'}
          </div>
          <div className={styles.pkPenaltyRow}>
            <span className={styles.pkPenaltyL}>威 望</span>
            <span className={`${styles.pkPenaltyV} ${victory ? styles.pkPenaltyVJade : ''}`}>
              {victory ? '+ ' : '- '}{reputation}
            </span>
          </div>
          <div className={styles.pkPenaltyRow}>
            <span className={styles.pkPenaltyL}>杀 戮 值</span>
            <span className={`${styles.pkPenaltyV} ${victory ? styles.pkPenaltyVJade : ''}`}>
              {victory ? '+ ' : '- '}{killValue}
            </span>
          </div>
          <div className={styles.pkPenaltyRow}>
            <span className={styles.pkPenaltyL}>掉 落</span>
            <span className={`${styles.pkPenaltyV} ${styles.pkPenaltyVGold}`}>{loot}</span>
          </div>
          <div className={styles.pkPenaltyRow}>
            <span className={styles.pkPenaltyL}>仇 恨 值</span>
            <span className={styles.pkPenaltyV}>对 方 + {hatred}</span>
          </div>
        </div>

        <div className={styles.pkInsight}>
          <div className={styles.pkInsightHd}>
            <span>✦ 本 局 关 键 帧</span>
            <span className={styles.pkInsightTag}>天 机</span>
          </div>
          <div className={styles.pkInsightBd}>{insight}</div>
        </div>
      </div>

      <div className={styles.pkActs}>
        <button type="button" className={styles.pkActBtn} onClick={() => navigateTo('ranking')}>查 看 仇 人 榜</button>
        <button
          type="button"
          className={`${styles.pkActBtn} ${styles.pkActBtnPrim}`}
          onClick={() => navigateTo('battle', { mode: 'pk' })}
        >
          {victory ? '继 续 追 杀' : '复 仇 出 击'}
        </button>
      </div>
    </div>
  );
}
