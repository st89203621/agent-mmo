import React from 'react';
import type { Emotion } from '../../types';
import styles from './NpcPortrait.module.css';

interface Props {
  npcName: string;
  emotion: Emotion;
  portraitBase?: string;
}

const EMOTION_LABELS: Record<string, string> = {
  calm: '平静', happy: '欢喜', sad: '悲伤', angry: '愤怒',
  shy: '娇羞', surprised: '惊讶', tender: '温柔', cold: '冷漠',
  fearful: '恐惧', determined: '坚定', melancholy: '惆怅', playful: '俏皮',
  gentle: '温柔', worried: '忧虑', serious: '肃穆', nervous: '紧张',
};

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
