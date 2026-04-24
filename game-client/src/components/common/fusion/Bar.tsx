import type { ReactNode } from 'react';
import styles from './Bar.module.css';

export type BarKind = 'hp' | 'mp' | 'rage' | 'exp' | 'soul' | 'gold';

interface BarProps {
  kind: BarKind;
  current: number;
  max: number;
  cells?: number;
  className?: string;
}

export function Bar({ kind, current, max, cells = 10, className = '' }: BarProps) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, current / safeMax));
  const filled = Math.round(ratio * cells);
  return (
    <span className={`${styles.bar} ${styles[kind]} ${className}`.trim()}>
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} className={i < filled ? styles.on : ''} />
      ))}
    </span>
  );
}

interface BarRowProps {
  label: string;
  kind: BarKind;
  current: number;
  max: number;
  note?: ReactNode;
  cells?: number;
}

export function BarRow({ label, kind, current, max, note, cells = 10 }: BarRowProps) {
  return (
    <div className={styles.barRow}>
      <span className={styles.label}>{label}</span>
      <span className={styles.val}>{current}/{max}</span>
      <Bar kind={kind} current={current} max={max} cells={cells} />
      {note ? <span className={styles.note}>{note}</span> : null}
    </div>
  );
}

interface BarBlockProps {
  children: ReactNode;
  className?: string;
}

export function BarBlock({ children, className = '' }: BarBlockProps) {
  return <div className={`${styles.barBlock} ${className}`.trim()}>{children}</div>;
}
