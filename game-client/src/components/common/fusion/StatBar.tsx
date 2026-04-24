import { Bar } from './Bar';
import styles from './StatBar.module.css';

const PROFESSION_TAG: Record<string, string> = {
  ATTACK: '攻',
  DEFENSE: '守',
  AGILITY: '敏',
  MAGIC: '法',
};

interface StatBarProps {
  profession?: string;
  name: string;
  level: number;
  exp: number;
  maxExp: number;
}

export default function StatBar({ profession, name, level, exp, maxExp }: StatBarProps) {
  const tag = PROFESSION_TAG[profession ?? ''] ?? '侠';
  const safeMax = maxExp > 0 ? maxExp : 1;
  const percent = Math.round((exp / safeMax) * 100);
  return (
    <div className={styles.statbar}>
      <span className={styles.tagClass}>{tag}</span>
      <span className={styles.name}>{name}</span>
      <span className={styles.lv}>Lv {level}</span>
      <Bar kind="exp" current={exp} max={maxExp} />
      <span className={styles.percent}>{percent}%</span>
    </div>
  );
}
