import { useEffect } from 'react';
import { useConfirmStore } from '../../store/confirmStore';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog() {
  const pending = useConfirmStore((s) => s.pending);
  const answer = useConfirmStore((s) => s.answer);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answer(false);
      else if (e.key === 'Enter') answer(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, answer]);

  if (!pending) return null;

  const {
    title = '请 确 认',
    message,
    confirmText = '确 认',
    cancelText = '取 消',
    danger = false,
  } = pending;

  return (
    <div className={styles.overlay} onClick={() => answer(false)}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.title}>{title}</div>
        <div className={styles.message}>{message}</div>
        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={() => answer(false)}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`${styles.btnConfirm} ${danger ? styles.btnDanger : ''}`.trim()}
            onClick={() => answer(true)}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
