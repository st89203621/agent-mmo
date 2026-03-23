import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { initPerson } from '../../services/api';
import styles from './PageSkeleton.module.css';

const HAIR_OPTIONS = ['长发', '短发', '束发', '披肩'];
const OUTFIT_OPTIONS = ['素衣', '华裳', '铠甲', '道袍'];

export default function CharCreatePage() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [hair, setHair] = useState(HAIR_OPTIONS[0]);
  const [outfit, setOutfit] = useState(OUTFIT_OPTIONS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const { navigateTo } = useGameStore();
  const { setPlayer, playerId, setPersonCreated } = usePlayerStore();

  const handleCreate = useCallback(async () => {
    const finalName = name.trim() || `旅人${Date.now() % 10000}`;
    setCreating(true);
    setError('');
    try {
      const res = await initPerson(finalName);
      setPlayer(playerId, res.name, '');
      setPersonCreated(true);
      navigateTo('story');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '创建失败');
    }
    setCreating(false);
  }, [name, playerId, setPlayer, setPersonCreated, navigateTo]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>创建角色</h2>
        <p className={styles.subtitle}>踏入轮回之前，先塑你今世之身</p>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.createPreview}>
          <div className={styles.avatarLarge}>
            {gender === 'female' ? '👩' : '👨'}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>角色名</h3>
          <input
            style={{
              width: '100%', padding: '10px 12px',
              background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)',
              borderRadius: 'var(--radius-md)', color: 'var(--ink)',
              fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入角色名（可留空自动生成）"
            maxLength={12}
          />
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>性别</h3>
          <div className={styles.optionRow}>
            <button className={`${styles.optionBtn} ${gender === 'female' ? styles.optionActive : ''}`}
                    onClick={() => setGender('female')}>女</button>
            <button className={`${styles.optionBtn} ${gender === 'male' ? styles.optionActive : ''}`}
                    onClick={() => setGender('male')}>男</button>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>发型</h3>
          <div className={styles.optionRow}>
            {HAIR_OPTIONS.map((h) => (
              <button
                key={h}
                className={`${styles.optionBtn} ${hair === h ? styles.optionActive : ''}`}
                onClick={() => setHair(h)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>服饰</h3>
          <div className={styles.optionRow}>
            {OUTFIT_OPTIONS.map((c) => (
              <button
                key={c}
                className={`${styles.optionBtn} ${outfit === c ? styles.optionActive : ''}`}
                onClick={() => setOutfit(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

        <button className={styles.primaryBtn} onClick={handleCreate} disabled={creating}>
          {creating ? '创建中...' : '确认创建'}
        </button>
      </div>
    </div>
  );
}
