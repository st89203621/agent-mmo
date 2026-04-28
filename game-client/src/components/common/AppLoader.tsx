import styles from './AppLoader.module.css';

interface Props {
  message?: string;
}

export default function AppLoader({ message = '正 在 连 接 江 湖 …' }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.glow} />
      <div className={styles.brand}>气 盖 山 河</div>
      <div className={styles.spinner}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.tip}>{message}</div>
    </div>
  );
}
