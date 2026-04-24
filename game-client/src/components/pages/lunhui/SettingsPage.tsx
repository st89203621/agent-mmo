import { logout } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import { usePlayerStore } from '../../../store/playerStore';
import styles from './LunhuiPages.module.css';

export default function SettingsPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const clearPlayer = usePlayerStore((s) => s.clearPlayer);

  const handleLogout = async () => {
    clearPlayer();
    try {
      await logout();
    } catch {
      // ignore
    }
    navigateTo('login');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>显示 / 音效 / 账号</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>设置</div>
          <div className={styles.subtitle}>基础配置</div>
        </div>
      </div>
      <div className={styles.scroll}>
        <div className={styles.panel}>
          <div className={styles.list}>
            <div className={styles.card}>
              <div className={styles.row}><span className={styles.name}>页面模式</span><span className={styles.meta}>高保真 H5</span></div>
            </div>
            <div className={styles.card}>
              <div className={styles.row}><span className={styles.name}>音效</span><span className={styles.meta}>默认开启</span></div>
            </div>
            <div className={styles.card}>
              <div className={styles.row}><span className={styles.name}>消息提醒</span><span className={styles.meta}>主城 / 邮件 / 拍卖</span></div>
            </div>
          </div>
        </div>

        <button className={`${styles.button} ${styles.buttonDanger}`} onClick={handleLogout}>
          退出登录
        </button>
      </div>
    </div>
  );
}
