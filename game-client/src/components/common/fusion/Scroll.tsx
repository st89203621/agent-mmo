import type { ReactNode, CSSProperties } from 'react';
import styles from './Scroll.module.css';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function Scroll({ children, className, style }: Props) {
  return (
    <div className={`${styles.scroll} ${className ?? ''}`.trim()} style={style}>
      {children}
    </div>
  );
}
