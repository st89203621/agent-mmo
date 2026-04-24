import { TELEPORT_GROUPS } from '../../../data/lunhuiWorld';
import { useGameStore } from '../../../store/gameStore';
import styles from './LunhuiPages.module.css';

export default function TeleportPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>梦中人 · 传送使者</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>传送菜单</div>
          <div className={styles.subtitle}>你心之所向，是何处？</div>
        </div>
      </div>

      <div className={styles.scroll}>
        {TELEPORT_GROUPS.map((group) => (
          <div key={group.label} className={styles.panel}>
            <div className={styles.panelTitle}>
              <span>{group.label}</span>
            </div>
            <div className={styles.grid2}>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={styles.button}
                  onClick={() => navigateTo(item.pageId, item.zoneId ? { zoneId: item.zoneId } : undefined)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button className={`${styles.button} ${styles.buttonAlt}`} onClick={() => navigateTo('hub')}>
          返回主城
        </button>
      </div>
    </div>
  );
}
