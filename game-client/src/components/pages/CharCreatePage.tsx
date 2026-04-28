import { useCallback, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { initPerson } from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';

const HAIR_OPTIONS = ['长 发', '短 发', '束 发', '披 肩'] as const;
const OUTFIT_OPTIONS = ['素 衣', '华 裳', '铠 甲', '道 袍'] as const;

type Profession = 'ATTACK' | 'DEFENSE' | 'AGILITY';

const PROFESSIONS: { id: Profession; name: string; desc: string }[] = [
  { id: 'ATTACK',  name: '无坚不摧', desc: '天生惊人攻击 · 一招灰飞烟灭' },
  { id: 'DEFENSE', name: '金刚护体', desc: '防高血厚 · 绝境反败为胜' },
  { id: 'AGILITY', name: '行动敏捷', desc: '高敏暴击 · 真正的王者' },
];

export default function CharCreatePage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const playerId = usePlayerStore((s) => s.playerId);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const setPersonCreated = usePlayerStore((s) => s.setPersonCreated);

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [hair, setHair] = useState<string>(HAIR_OPTIONS[0]);
  const [outfit, setOutfit] = useState<string>(OUTFIT_OPTIONS[0]);
  const [profession, setProfession] = useState<Profession>('ATTACK');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = useCallback(async () => {
    const finalName = name.trim() || `旅人${Date.now() % 10000}`;
    setCreating(true);
    setError('');
    try {
      const features = `${hair.replace(/\s/g, '')}，${outfit.replace(/\s/g, '')}`;
      const res = await initPerson(finalName, gender, features, profession);
      setPlayer(playerId, res.name, '');
      setPersonCreated(true);
      navigateTo('home');
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    }
    setCreating(false);
  }, [name, gender, hair, outfit, profession, playerId, setPlayer, setPersonCreated, navigateTo]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>塑 身</span>
            <span className={styles.appbarZone}>轮回之前 · 塑今世之身</span>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.ccHero}>
          <div className={styles.ccHeroTitle}>{gender === 'female' ? '红 颜' : '铁 骨'}</div>
          <div className={styles.ccHeroSub}>{name.trim() || '未 名 侠 客'}</div>
        </div>

        <div className={styles.ccSection}>
          <div className={styles.ccLabel}>角 色 名</div>
          <input
            className={styles.ccInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入角色名 · 留空自动生成"
            maxLength={12}
          />
        </div>

        <div className={styles.ccSection}>
          <div className={styles.ccLabel}>职 业 路 线</div>
          <div className={styles.ccProList}>
            {PROFESSIONS.map((p) => (
              <button
                key={p.id}
                className={`${styles.ccProItem} ${profession === p.id ? styles.ccProItemOn : ''}`.trim()}
                onClick={() => setProfession(p.id)}
                type="button"
              >
                <div className={styles.ccProName}>{p.name}</div>
                <div className={styles.ccProDesc}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.ccSection}>
          <div className={styles.ccLabel}>性 别</div>
          <div className={styles.ccGridHalf}>
            <button
              className={`${styles.ccOption} ${gender === 'female' ? styles.ccOptionOn : ''}`.trim()}
              onClick={() => setGender('female')}
              type="button"
            >女</button>
            <button
              className={`${styles.ccOption} ${gender === 'male' ? styles.ccOptionOn : ''}`.trim()}
              onClick={() => setGender('male')}
              type="button"
            >男</button>
          </div>
        </div>

        <div className={styles.ccSection}>
          <div className={styles.ccLabel}>发 型</div>
          <div className={styles.ccGridHalf}>
            {HAIR_OPTIONS.map((h) => (
              <button
                key={h}
                className={`${styles.ccOption} ${hair === h ? styles.ccOptionOn : ''}`.trim()}
                onClick={() => setHair(h)}
                type="button"
              >{h}</button>
            ))}
          </div>
        </div>

        <div className={styles.ccSection}>
          <div className={styles.ccLabel}>服 饰</div>
          <div className={styles.ccGridHalf}>
            {OUTFIT_OPTIONS.map((c) => (
              <button
                key={c}
                className={`${styles.ccOption} ${outfit === c ? styles.ccOptionOn : ''}`.trim()}
                onClick={() => setOutfit(c)}
                type="button"
              >{c}</button>
            ))}
          </div>
        </div>

        {error && <div className={styles.ccErrorTip}>{error}</div>}

        <button
          className={styles.ccSubmit}
          onClick={handleCreate}
          disabled={creating}
          type="button"
        >
          {creating ? '塑 身 中 ...' : '✦ 确 认 塑 身'}
        </button>
      </div>
    </div>
  );
}
