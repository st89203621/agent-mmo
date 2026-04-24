import type { ReactNode } from 'react';
import styles from './Phone.module.css';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function Phone({ children, className }: Props) {
  return <div className={`${styles.phone} ${className ?? ''}`.trim()}>{children}</div>;
}
