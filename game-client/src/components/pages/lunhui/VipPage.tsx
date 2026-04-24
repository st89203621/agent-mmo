import styles from './LunhuiPages.module.css';

const benefits = [
  ['拍卖手续费 -50%', 'V3 解锁'],
  ['离线托管时长 +8h', 'V5 解锁'],
  ['世界 Boss 额外奖励', 'V8 解锁'],
  ['每日在线领奖翻倍', 'V10 解锁'],
];

export default function VipPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>特权 / 月卡 / 每日福利</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>VIP 中心</div>
          <div className={styles.subtitle}>当前 V0</div>
        </div>
      </div>
      <div className={styles.scroll}>
        <div className={styles.hero}>
          <div className={styles.heroTitle}>充值成长线</div>
          <div className={styles.heroSub}>首充礼包、累充里程碑、月卡与 VIP 特权都从这里进入。</div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>特权预览</span>
          </div>
          <div className={styles.list}>
            {benefits.map(([name, unlock]) => (
              <div key={name} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.name}>{name}</div>
                  <div className={styles.meta}>{unlock}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
