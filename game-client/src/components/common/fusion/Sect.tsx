import type { ReactNode } from 'react';
import styles from './Sect.module.css';

interface Props {
  children: ReactNode;
  more?: ReactNode;
  onMore?: () => void;
}

export default function Sect({ children, more, onMore }: Props) {
  return (
    <div className={styles.sect}>
      <span>{children}</span>
      {(more || onMore) && (
        <button className={styles.more} onClick={onMore} type="button">
          {more ?? '更 多 ›'}
        </button>
      )}
    </div>
  );
}
