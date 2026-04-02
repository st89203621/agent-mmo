import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '../../store/toastStore';
import { fetchWorldBoss, attackWorldBoss, fetchBossRank, type WorldBossData, type BossRankEntry } from '../../services/api';
import page from '../../styles/page.module.css';
import own from './WorldBossPage.module.css';

const styles = { ...page, ...own };

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

const REWARDS = [
  { icon: '🗡️', name: '神器碎片' },
  { icon: '💎', name: '太古灵石' },
  { icon: '📜', name: '技能残页' },
  { icon: '🧪', name: '万年灵药' },
];

export default function WorldBossPage() {
  const [boss, setBoss] = useState<WorldBossData | null>(null);
  const [rank, setRank] = useState<BossRankEntry[]>([]);
  const [myDamage, setMyDamage] = useState(0);
  const [attacking, setAttacking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [dmgFloats, setDmgFloats] = useState<{ id: number; value: number }[]>([]);
  const floatId = React.useRef(0);

  const loadBoss = useCallback(async () => {
    try {
      const data = await fetchWorldBoss();
      setBoss(data);
      setMyDamage(data.myDamage ?? 0);
    } catch { /* noop */ }
  }, []);

  const loadRank = useCallback(async () => {
    try {
      const data = await fetchBossRank();
      setRank(data.entries || []);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    loadBoss();
    loadRank();
  }, [loadBoss, loadRank]);

  // 冷却倒计时
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleAttack = useCallback(async () => {
    if (attacking || cooldown > 0) return;
    setAttacking(true);
    try {
      const res = await attackWorldBoss();
      const dmg = res.damage ?? 0;
      setMyDamage(prev => prev + dmg);
      // 更新Boss血量
      if (boss) {
        setBoss({ ...boss, currentHp: Math.max(0, boss.currentHp - dmg) });
      }
      // 伤害飘字
      const id = ++floatId.current;
      setDmgFloats(prev => [...prev, { id, value: dmg }]);
      setTimeout(() => setDmgFloats(prev => prev.filter(f => f.id !== id)), 1000);
      // 冷却
      setCooldown(res.cooldownSeconds ?? 3);
      // 刷新排行
      loadRank();
      if (res.reward) {
        toast.reward(res.reward);
      }
    } catch (e: any) {
      toast.error(e.message || '攻击失败');
    }
    setAttacking(false);
  }, [attacking, cooldown, boss, loadRank]);

  const hpPct = boss ? Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100)) : 100;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>诸神黄昏</h2>
        <p className={styles.subtitle}>全服联手讨伐混沌魔神</p>
      </div>

      {/* Boss场景 */}
      <div className={styles.bossScene}>
        <div className={styles.bossGlow} />
        <div className={styles.bossAvatar}>👹</div>
        <div className={styles.bossName}>{boss?.bossName || '混沌魔神·蚩尤'}</div>
        <div className={styles.bossTitle}>{boss?.bossTitle || '远古封印解除 · 第一形态'}</div>

        <div className={styles.hpSection}>
          <div className={styles.hpLabel}>
            <span>全服血量</span>
            <span>{boss ? `${((boss.currentHp / boss.maxHp) * 100).toFixed(1)}%` : '...'}</span>
          </div>
          <div className={styles.hpBarWrap}>
            <div className={styles.hpBarFill} style={{ width: `${hpPct}%` }} />
            <div className={styles.hpText}>
              {boss ? `${formatNum(boss.currentHp)} / ${formatNum(boss.maxHp)}` : '加载中...'}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.scrollArea}>
        {/* 攻击区域 */}
        <div className={styles.attackSection}>
          <div className={styles.myDamageRow}>
            <span className={styles.myDamageLabel}>我的累计伤害</span>
            <span className={styles.myDamageVal}>{formatNum(myDamage)}</span>
          </div>

          <button
            className={styles.attackBtn}
            disabled={attacking || cooldown > 0 || (boss?.currentHp ?? 0) <= 0}
            onClick={handleAttack}
          >
            <span className={styles.attackBtnShine} />
            {(boss?.currentHp ?? 0) <= 0
              ? '魔神已伏诛'
              : cooldown > 0
              ? `冷却中 ${cooldown}s`
              : attacking
              ? '攻击中...'
              : '全力一击'}
          </button>
          {cooldown > 0 && (
            <div className={styles.cooldownText}>蓄力中，{cooldown}秒后可再次攻击</div>
          )}
        </div>

        {/* 奖励预览 */}
        <div style={{ padding: '0 16px' }}>
          <div className={styles.rankTitle}>击杀奖励</div>
          <div className={styles.rewardPreview}>
            {REWARDS.map(r => (
              <div key={r.name} className={styles.rewardItem}>
                <span className={styles.rewardIcon}>{r.icon}</span>
                <span className={styles.rewardName}>{r.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 伤害排行 */}
        <div className={styles.rankSection} style={{ marginTop: 16 }}>
          <div className={styles.rankTitle}>伤害排行榜</div>
          {rank.length > 0 ? (
            <div className={styles.rankList}>
              {rank.map((e, i) => (
                <div key={i} className={`${styles.rankItem} ${i < 3 ? styles.rankTop : ''}`}>
                  <span className={styles.rankPos}>
                    {i < 3 ? RANK_MEDALS[i] : `${i + 1}`}
                  </span>
                  <div className={styles.rankInfo}>
                    <span className={styles.rankName}>{e.playerName}</span>
                  </div>
                  <span className={styles.rankDmg}>{formatNum(e.damage)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>暂无伤害记录</p>
              <p className={styles.hint}>率先出击，登顶排行！</p>
            </div>
          )}
        </div>
      </div>

      {/* 伤害飘字 */}
      {dmgFloats.map(f => (
        <div key={f.id} className={styles.dmgFloat}>-{formatNum(f.value)}</div>
      ))}
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString();
}
