import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface Props {
  icon?: string;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

/**
 * 仙侠风空态卡片：大字 + serif 金色标题 + 米色描述 + 可选 CTA。
 * 取代各页面零散的"暂无 XX"裸文字。
 */
export default function EmptyState({ icon = '✦', title, hint, action, compact = false }: Props) {
  const cls = compact ? `${styles.empty} ${styles.compact}` : styles.empty;
  return (
    <div className={cls}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.title}>{title}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
