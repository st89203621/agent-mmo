import { useEffect, useMemo, useState } from 'react';
import { fetchVipInfo, type VipInfo } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import { toast } from '../../../store/toastStore';
import styles from './LunhuiPages.module.css';
import { usePageBackground } from '../../common/PageShell';
import { PAGE_BG } from '../../../data/pageBackgrounds';

export default function VipPage() {
  usePageBackground(PAGE_BG.VIP);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [info, setInfo] = useState<VipInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchVipInfo()
      .then((data) => { if (!cancelled) setInfo(data); })
      .catch(() => { if (!cancelled) setInfo(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const progressPct = useMemo(() => {
    if (!info || info.nextLevelExp <= 0) return 0;
    return Math.min(100, Math.round((info.currentExp / info.nextLevelExp) * 100));
  }, [info]);

  const currentLevel = info?.level ?? 0;
  const benefits = info?.benefits ?? [];
  const milestones = info?.milestones ?? [];

  const handleTopup = () => toast.info('充值入口筹备中');
  const handleMonthlyCard = () => toast.info('月卡功能即将上线');

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>V I P</span>
            <span className={styles.appbarZone}>成长线 · 月卡 · 特权</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('shop')} type="button" aria-label="商城">商</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('mail')} type="button" aria-label="邮件">邮</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.feedEmpty}>VIP 信息载入中...</div>
      ) : (
        <div className={styles.scrollPlain}>
          <div className={styles.vipHero}>
            <div className={styles.vipHeroCrown}>尊 荣 之 路</div>
            <div className={styles.vipHeroLv}>
              当前 <span className={styles.vipHeroLvNum}>V{currentLevel}</span>
              {info && info.nextLevelExp > 0 && `· 距下一级 ${info.nextLevelExp - info.currentExp}`}
            </div>
            <div className={styles.vipProgress}>
              <div className={styles.vipProgressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <div className={styles.vipProgressText}>
              {info ? `${info.currentExp} / ${info.nextLevelExp}` : '—'} · 成长值
            </div>
          </div>

          <div className={styles.vipMonthlyCard}>
            <div className={styles.vipMonthlyCardInfo}>
              <div className={styles.vipMonthlyCardTitle}>
                {info?.monthlyCardActive ? '月卡已激活' : '月卡 · 每日福利'}
              </div>
              <div className={styles.vipMonthlyCardDesc}>
                {info?.monthlyCardActive
                  ? `到期 ${new Date(info.monthlyCardExpireAt).toLocaleDateString('zh-CN')}`
                  : '每日赠送玩币 + 双倍经验 · 30 天有效'}
              </div>
            </div>
            <button
              className={styles.vipMonthlyCardBtn}
              onClick={handleMonthlyCard}
              disabled={info?.monthlyCardActive}
              type="button"
            >
              {info?.monthlyCardActive ? '已激活' : '开 通'}
            </button>
          </div>

          <div className={styles.sectRow}>
            特 权 一 览
            <span className={styles.sectMore}>{benefits.length} 项</span>
          </div>
          {benefits.length === 0 ? (
            <div className={styles.feedEmpty}>暂无特权配置</div>
          ) : (
            benefits.map((b) => {
              const unlocked = currentLevel >= b.unlockLevel;
              return (
                <div
                  key={b.key}
                  className={`${styles.vipBenefit} ${unlocked ? styles.vipBenefitUnlocked : ''}`.trim()}
                >
                  <span className={styles.vipBenefitN}>{b.name}</span>
                  <span className={`${styles.vipBenefitLv} ${unlocked ? styles.vipBenefitLvOn : ''}`.trim()}>
                    {unlocked ? '已解锁' : `V${b.unlockLevel} 解锁`}
                  </span>
                </div>
              );
            })
          )}

          <div className={styles.sectRow}>
            里 程 碑 礼 包
            <span className={styles.sectMore}>{milestones.length} 档</span>
          </div>
          {milestones.length === 0 ? (
            <div className={styles.feedEmpty}>暂无里程碑</div>
          ) : (
            milestones.map((m) => {
              const reached = currentLevel >= m.level;
              return (
                <div key={m.level} className={styles.vipMile}>
                  <div className={styles.vipMileLv}>V{m.level}</div>
                  <div className={styles.vipMileInfo}>
                    <div className={styles.vipMileReward}>{m.reward}</div>
                    <div className={styles.vipMileCost}>累充 {m.cost.toLocaleString()} 玩币</div>
                  </div>
                  <button
                    className={styles.vipMileBtn}
                    onClick={handleTopup}
                    disabled={reached}
                    type="button"
                  >
                    {reached ? '已 领' : '充 值'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
