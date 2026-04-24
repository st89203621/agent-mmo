import { useEffect, useState } from 'react';
import { fetchPersonInfo } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import { usePlayerStore } from '../../../store/playerStore';
import styles from './LunhuiPages.module.css';

export default function CharSelectPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const playerName = usePlayerStore((s) => s.playerName);
  const personCreated = usePlayerStore((s) => s.personCreated);
  const setPersonCreated = usePlayerStore((s) => s.setPersonCreated);
  const [personName, setPersonName] = useState('');
  const [profession, setProfession] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonInfo()
      .then((data) => {
        setPersonCreated(!!data.exists);
        setPersonName(data.name || '');
        setProfession(data.profession || 'ATTACK');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setPersonCreated]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>Server 83 · 气盖山河</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>角色选择</div>
          <div className={styles.subtitle}>{playerName || '侠客'}</div>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.hero}>
          <div className={styles.heroTitle}>{personCreated ? personName || '丿征战丶蔷薇' : '空置角色位'}</div>
          <div className={styles.heroSub}>
            {loading
              ? '正在读取角色档案…'
              : personCreated
                ? `职业 · ${profession} · 已就绪，点击进入主城继续征战。`
                : '当前账号尚未创建角色，先捏出今世之身，再踏入气盖山河。'}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>角色槽位</span>
            <span className={styles.chip}>01 / 01</span>
          </div>
          <div className={styles.card}>
            <div className={styles.row}>
              <div className={styles.stack}>
                <div className={styles.name}>{personCreated ? (personName || '丿征战丶蔷薇') : '未创建角色'}</div>
                <div className={styles.meta}>{personCreated ? `职业 ${profession}` : '点击下方按钮创建'}</div>
              </div>
              <span className={styles.chip}>{personCreated ? '已激活' : '空位'}</span>
            </div>
          </div>
        </div>

        <div className={styles.grid2}>
          <button className={`${styles.button} ${styles.buttonAlt}`} onClick={() => navigateTo('login')}>
            返回登录
          </button>
          <button
            className={styles.button}
            onClick={() => navigateTo(personCreated ? 'home' : 'char-create')}
          >
            {personCreated ? '进入游戏' : '创建角色'}
          </button>
        </div>
      </div>
    </div>
  );
}
