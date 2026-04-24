import styles from './LunhuiPages.module.css';

const rooms = [
  ['前庭', '每日可领取金币与木材收益。'],
  ['卧房', '提升离线托管时长与体力回复。'],
  ['工坊', '产出强化材料与家园摆件。'],
];

export default function HousingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>家园 / 串门 / 家业</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>家产</div>
          <div className={styles.subtitle}>一阶院落</div>
        </div>
      </div>
      <div className={styles.scroll}>
        <div className={styles.hero}>
          <div className={styles.heroTitle}>雪镇小院</div>
          <div className={styles.heroSub}>家园是经济与休闲系统的一部分，后续可扩建房间、拜访邻居并领取经营收益。</div>
        </div>
        <div className={styles.panel}>
          <div className={styles.list}>
            {rooms.map(([name, desc]) => (
              <div key={name} className={styles.card}>
                <div className={styles.name}>{name}</div>
                <div className={styles.desc}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
