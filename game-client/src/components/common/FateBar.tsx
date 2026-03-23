import React from 'react';
import styles from './FateBar.module.css';

interface Props {
  fateScore: number;
  trustScore: number;
  npcName: string;
  compact?: boolean;
}

function getFateLabel(score: number): string {
  if (score >= 80) return '情深缘定';
  if (score >= 60) return '心意相通';
  if (score >= 30) return '渐生情愫';
  return '萍水相逢';
}

function getFateColor(score: number): string {
  if (score >= 80) return '#c04060';
  if (score >= 60) return '#c08040';
  if (score >= 30) return '#7ca8c6';
  return '#9e9e9e';
}

export default function FateBar({ fateScore, trustScore, npcName, compact }: Props) {
  const fateColor = getFateColor(fateScore);

  if (compact) {
    return (
      <div className={styles.compact}>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${fateScore}%`, background: fateColor }} />
        </div>
        <span className={styles.score}>{fateScore}</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>与{npcName}的缘分</span>
        <span className={styles.level} style={{ color: fateColor }}>{getFateLabel(fateScore)}</span>
      </div>
      <div className={styles.bars}>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>缘</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${fateScore}%`, background: fateColor }} />
          </div>
          <span className={styles.score}>{fateScore}</span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>信</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${trustScore}%`, background: 'var(--blue)' }} />
          </div>
          <span className={styles.score}>{trustScore}</span>
        </div>
      </div>
    </div>
  );
}
