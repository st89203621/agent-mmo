import { useEffect, useState } from 'react';
import { fetchPersonInfo, type PersonData } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import { usePlayerStore } from '../../../store/playerStore';
import lunhui from './LunhuiPages.module.css';
import styles from './CharSelectPage.module.css';

export default function CharSelectPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const playerName = usePlayerStore((s) => s.playerName);
  const personCreated = usePlayerStore((s) => s.personCreated);
  const setPersonCreated = usePlayerStore((s) => s.setPersonCreated);
  const [data, setData] = useState<PersonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonInfo()
      .then((d) => {
        setPersonCreated(!!d.exists);
        setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setPersonCreated]);

  const personName = data?.name || '';
  const profession = data?.profession || '';
  const portraitUrl = data?.portraitUrl;
  const level = data?.level;
  const expPercent = level && level.maxExp > 0
    ? Math.min(100, (level.exp / level.maxExp) * 100)
    : 0;
  const displayName = personCreated ? (personName || '丿征战丶蔷薇') : '空置角色位';
  const initial = (personName || playerName || '侠').charAt(0);

  return (
    <div className={lunhui.page}>
      <header className={styles.header}>
        <div className={styles.serverTag}>Server 83 · 气盖山河</div>
        <div className={styles.playerTag}>{playerName || '侠客'}</div>
      </header>

      <div className={styles.titleBlock}>
        <span className={styles.titleSeal}>选</span>
        <div>
          <div className={styles.titleZh}>角色选择</div>
          <div className={styles.titleEn}>CHOOSE YOUR PATH</div>
        </div>
      </div>

      <main className={lunhui.scroll}>
        <section className={`${styles.hero} ${personCreated ? '' : styles.heroEmpty}`}>
          <div className={styles.heroPortrait}>
            {portraitUrl ? (
              <img src={portraitUrl} alt={displayName} draggable={false} />
            ) : (
              <span className={styles.heroPlaceholder}>{initial}</span>
            )}
            {personCreated && level && (
              <span className={styles.heroLevel}>
                <span className={styles.heroLevelLabel}>Lv</span>
                <span className={styles.heroLevelValue}>{level.level}</span>
              </span>
            )}
          </div>

          <div className={styles.heroBody}>
            <div className={styles.heroName}>{loading ? '——' : displayName}</div>

            {personCreated && (
              <div className={styles.heroBadgeRow}>
                {profession && <span className={styles.heroBadge}>{profession}</span>}
                <span className={styles.heroSlot}>SLOT 01 / 01</span>
              </div>
            )}

            <div className={styles.heroDivider} />

            <p className={styles.heroDesc}>
              {loading
                ? '正在读取角色档案…'
                : personCreated
                  ? '魂魄已稳，气运正盛。点击「进入气盖山河」，重启七世轮回之程。'
                  : '今世未有此身。先捏一具皮囊，再踏入气盖山河。'}
            </p>

            {personCreated && level && (
              <div className={styles.expBar}>
                <div className={styles.expFill} style={{ width: `${expPercent}%` }} />
                <span className={styles.expText}>{level.exp} / {level.maxExp}</span>
              </div>
            )}
          </div>
        </section>

        <div className={styles.actionRow}>
          <button className={styles.btnGhost} onClick={() => navigateTo('login')}>
            ← 返回登录
          </button>
          <button
            className={styles.btnPrimary}
            disabled={loading}
            onClick={() => navigateTo(personCreated ? 'home' : 'char-create')}
          >
            <span>{personCreated ? '进入气盖山河' : '创建今世之身'}</span>
            <i className={styles.btnArrow}>›</i>
          </button>
        </div>
      </main>
    </div>
  );
}
