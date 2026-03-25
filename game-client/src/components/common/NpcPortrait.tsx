import React from 'react';
import type { Emotion } from '../../types';
import { EMOTION_LABELS } from '../../constants/emotion';
import styles from './NpcPortrait.module.css';

interface Props {
  npcName: string;
  emotion: Emotion;
  portraitBase?: string;
}

export default function NpcPortrait({ npcName, emotion, portraitBase }: Props) {
  const emotionColor = `var(--emotion-${emotion})`;

  return (
    <div className={styles.portrait} style={{ borderColor: emotionColor }}>
      <div className={styles.imageArea}>
        {portraitBase ? (
          <img src={`/assets/npc/${portraitBase}_${emotion}.webp`} alt={npcName}
               className={styles.img}
               onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : null}
        <div className={styles.placeholder}>
          <span className={styles.placeholderName}>{npcName}</span>
        </div>
      </div>
      <div className={styles.nameBar}>
        <span className={styles.name}>{npcName}</span>
        <span className={styles.emotionTag} style={{ background: emotionColor }}>
          {EMOTION_LABELS[emotion] || '平静'}
        </span>
      </div>
    </div>
  );
}
