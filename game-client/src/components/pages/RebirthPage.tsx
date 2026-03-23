import React from 'react';
import { usePlayerStore } from '../../store/playerStore';
import styles from './PageSkeleton.module.css';

/** P05 · 轮回转场页 */
export default function RebirthPage() {
  const { playerWorld } = usePlayerStore();

  return (
    <div className={styles.pageDark}>
      <div className={styles.rebirthCenter}>
        <span className={styles.rebirthIcon}>☯</span>
        <h2 className={styles.rebirthTitle}>轮回</h2>
        <p className={styles.rebirthPoem}>
          此世缘尽，来世再续
        </p>
        {playerWorld && (
          <div className={styles.worldTimeline}>
            {playerWorld.worlds.map((w) => (
              <div key={w.worldIndex}
                   className={`${styles.worldDot} ${w.status === 'CURRENT' ? styles.worldDotActive : ''} ${w.status === 'COMPLETED' ? styles.worldDotDone : ''}`}>
                {w.worldIndex + 1}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
