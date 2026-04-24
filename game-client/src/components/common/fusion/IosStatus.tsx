import { useEffect, useState } from 'react';
import styles from './IosStatus.module.css';

function fmt(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function IosStatus() {
  const [time, setTime] = useState(() => fmt(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(fmt(new Date())), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.iosStatus}>
      <span>{time}</span>
      <div className={styles.right}>
        <span className={styles.sig} />
        <span>5G</span>
        <span className={styles.batt} />
      </div>
    </div>
  );
}
