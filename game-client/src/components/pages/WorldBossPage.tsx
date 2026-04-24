import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../../store/toastStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchWorldBoss,
  attackWorldBoss,
  fetchBossRank,
  type WorldBossData,
  type BossRankEntry,
} from '../../services/api';
import styles from './WorldBossPage.module.css';

const HP_SEGMENTS = 20;

const REWARDS: ReadonlyArray<{ icon: string; name: string }> = [
  { icon: '器', name: '神器碎片' },
  { icon: '玉', name: '太古灵石' },
  { icon: '卷', name: '技能残页' },
  { icon: '丹', name: '万年灵药' },
];

interface DmgFloat {
  id: number;
  value: number;
  crit: boolean;
}

function formatNum(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}亿`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString();
}

function formatCd(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function avatarChar(name: string): string {
  return name.replace(/[·•、\s]/g, '').slice(0, 1) || '影';
}

export default function WorldBossPage() {
  const playerId = usePlayerStore((s) => s.playerId);
  const [boss, setBoss] = useState<WorldBossData | null>(null);
  const [rank, setRank] = useState<BossRankEntry[]>([]);
  const [myDamage, setMyDamage] = useState(0);
  const [attacking, setAttacking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [floats, setFloats] = useState<DmgFloat[]>([]);
  const floatId = useRef(0);

  const loadBoss = useCallback(async () => {
    try {
      const data = await fetchWorldBoss();
      setBoss(data);
      setMyDamage(data.myDamage ?? 0);
    } catch {
      /* noop */
    }
  }, []);

  const loadRank = useCallback(async () => {
    try {
      const data = await fetchBossRank();
      setRank(data.entries || []);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    loadBoss();
    loadRank();
  }, [loadBoss, loadRank]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleAttack = useCallback(async () => {
    if (attacking || cooldown > 0 || (boss?.currentHp ?? 0) <= 0) return;
    setAttacking(true);
    try {
      const res = await attackWorldBoss();
      const dmg = res.damage ?? 0;
      const crit = dmg >= 2000;
      setMyDamage((prev) => prev + dmg);
      setBoss((prev) => (prev ? { ...prev, currentHp: Math.max(0, prev.currentHp - dmg) } : prev));

      const id = ++floatId.current;
      setFloats((prev) => [...prev, { id, value: dmg, crit }]);
      window.setTimeout(() => {
        setFloats((prev) => prev.filter((f) => f.id !== id));
      }, 900);

      setCooldown(res.cooldownSeconds ?? 3);
      loadRank();
      if (res.reward) toast.reward(res.reward);
    } catch (e) {
      toast.error((e as Error).message || '攻击失败');
    } finally {
      setAttacking(false);
    }
  }, [attacking, cooldown, boss, loadRank]);

  const handleRally = useCallback(() => {
    toast.info('已向全服发起召集 · 公会频道广播');
  }, []);

  const hpPct = boss ? Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100)) : 100;
  const activeSegs = Math.ceil((hpPct / 100) * HP_SEGMENTS);

  const myRank = useMemo(() => {
    if (!playerId) return 0;
    const idx = rank.findIndex((r) => r.playerId === playerId);
    return idx >= 0 ? idx + 1 : 0;
  }, [rank, playerId]);

  const isMine = (rowId: string) => !!playerId && rowId === playerId;

  const totalDamage = useMemo(
    () => rank.reduce((sum, r) => sum + (r.damage || 0), 0),
    [rank],
  );

  const bossDead = (boss?.currentHp ?? 0) <= 0;
  const attackLabel = bossDead ? '魔 神 已 伏 诛' : cooldown > 0 ? `冷 却 ${cooldown}s` : attacking ? '攻 击 中' : '全 力 一 击';

  return (
    <div className={styles.page}>
      {/* BOSS 立绘区 */}
      <div className={styles.hero}>
        <div className={styles.bossFrame}>煞</div>
        <div className={styles.nameRow}>
          <div className={styles.bossName}>{boss?.bossName || '混沌魔神·蚩尤'}</div>
          <div className={styles.bossTitle}>{boss?.bossTitle || 'LV ∞ · 远古封印 · 第一形态'}</div>
        </div>

        {floats.map((f) => (
          <div
            key={f.id}
            className={`${styles.dmgFloat}${f.crit ? ` ${styles.dmgFloatCrit}` : ''}`}
          >
            -{formatNum(f.value)}{f.crit ? ' 暴击' : ''}
          </div>
        ))}
      </div>

      {/* 分段血条 */}
      <div className={styles.hp}>
        <div className={styles.hpTop}>
          <span className={styles.hpK}>全 服 血 量</span>
          <span className={styles.hpV}>
            {boss ? `${formatNum(boss.currentHp)} / ${formatNum(boss.maxHp)}` : '…'}
          </span>
        </div>
        <div className={styles.segWrap}>
          {Array.from({ length: HP_SEGMENTS }, (_, i) => {
            const filled = i < activeSegs;
            const current = filled && i === activeSegs - 1;
            const cls = current ? styles.segCur : filled ? styles.segOn : '';
            return <div key={i} className={`${styles.seg}${cls ? ` ${cls}` : ''}`} />;
          })}
        </div>
        <div className={styles.hpFooter}>
          <span>剩 余 {hpPct.toFixed(1)}%</span>
          {cooldown > 0 ? (
            <span className={styles.hpCd}>下 击 {formatCd(cooldown)}</span>
          ) : (
            <span>可 出 击</span>
          )}
        </div>
      </div>

      {/* 战斗信息 */}
      <div className={styles.info}>
        <div className={styles.infoRow}>
          <span className={styles.infoK}>我 的 伤 害</span>
          <span className={`${styles.infoV} ${styles.infoVRed}`}>{formatNum(myDamage)}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoK}>我 的 排 名</span>
          <span className={`${styles.infoV} ${styles.infoVGold}`}>
            {myRank > 0 ? `第 ${myRank} 位` : '未 上 榜'}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoK}>参 战 人 数</span>
          <span className={styles.infoV}>{rank.length} 人</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoK}>累 计 伤 害</span>
          <span className={styles.infoV}>{formatNum(totalDamage)}</span>
        </div>
      </div>

      {/* 奖励预览 */}
      <div className={styles.rewards}>
        {REWARDS.map((r) => (
          <div key={r.name} className={styles.rewardItem}>
            <span className={styles.rewardIcon}>{r.icon}</span>
            <span className={styles.rewardName}>{r.name}</span>
          </div>
        ))}
      </div>

      {/* 伤害榜 */}
      <div className={styles.dmg}>
        <div className={styles.dmgH}>— 伤 害 排 行 —</div>
        {rank.length > 0 ? (
          rank.map((e, i) => {
            const rk = i + 1;
            const mine = isMine(e.playerId);
            const rkCls = i === 0 ? styles.dmgR1 : i === 1 ? styles.dmgR2 : i === 2 ? styles.dmgR3 : '';
            return (
              <div
                key={e.playerId}
                className={`${styles.dmgRow}${rkCls ? ` ${rkCls}` : ''}`}
              >
                <span className={styles.dmgRk}>{rk}</span>
                <span className={styles.dmgAv}>{avatarChar(e.playerName)}</span>
                <span className={`${styles.dmgNm}${mine ? ` ${styles.dmgNmMine}` : ''}`}>
                  {mine && <span className={styles.dmgTag}>[我]</span>}
                  {e.playerName}
                </span>
                <span className={styles.dmgV}>{formatNum(e.damage)}</span>
              </div>
            );
          })
        ) : (
          <div className={styles.dmgEmpty}>
            暂 无 伤 害 记 录
            <div className={styles.dmgEmptyHint}>率 先 出 击 · 登 顶 排 行</div>
          </div>
        )}
      </div>

      {/* 双按钮 */}
      <div className={styles.ops}>
        <button type="button" className={`${styles.opsBtn} ${styles.opsCall}`} onClick={handleRally}>
          召 集 盟 友
        </button>
        <button
          type="button"
          className={`${styles.opsBtn} ${styles.opsAtk}`}
          disabled={attacking || cooldown > 0 || bossDead}
          onClick={handleAttack}
        >
          {attackLabel}
        </button>
      </div>
    </div>
  );
}
