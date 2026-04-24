import type { ReactNode } from 'react';
import styles from './AppBar.module.css';

interface Props {
  book?: ReactNode;
  zone?: ReactNode;
  coord?: ReactNode;
  icons?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

export default function AppBar({ book, zone, coord, icons, onBack, backLabel = '返' }: Props) {
  return (
    <div className={styles.appbar}>
      <div className={styles.row1}>
        {onBack && (
          <button className={styles.back} onClick={onBack} aria-label="返回">
            {backLabel}
          </button>
        )}
        <div className={styles.loc}>
          {book && <span className={styles.book}>{book}</span>}
          {zone && <span className={styles.zone}>{zone}</span>}
          {coord && <span className={styles.coord}>{coord}</span>}
        </div>
        {icons && <div className={styles.icons}>{icons}</div>}
      </div>
    </div>
  );
}

interface IconProps {
  children: ReactNode;
  onClick?: () => void;
  dot?: boolean;
  ariaLabel?: string;
}

export function AppBarIcon({ children, onClick, dot, ariaLabel }: IconProps) {
  return (
    <button
      className={`${styles.icon} ${dot ? styles.dot : ''}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel}
      type="button"
    >
      {children}
    </button>
  );
}
