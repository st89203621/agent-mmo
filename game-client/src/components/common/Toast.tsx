import React from 'react';
import { useToastStore, type ToastType } from '../../store/toastStore';
import styles from './Toast.module.css';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: '◈',
  warning: '⚠',
  reward: '★',
};

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span className={styles.icon}>{ICONS[t.type]}</span>
          <span className={styles.message}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
