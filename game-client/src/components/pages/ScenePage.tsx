import { useEffect, useState, useCallback } from 'react';
import { fetchScenes, enterScene, type GameSceneData } from '../../services/api';
import { toast } from '../../store/toastStore';
import styles from './PageSkeleton.module.css';

const SCENE_THEMES: Record<string, { color: string; bg: string }> = {
  adventure: { color: '#e8a642', bg: 'rgba(232,166,66,0.12)' },
  pirate:    { color: '#5ca0d3', bg: 'rgba(92,160,211,0.12)' },
  mecha:     { color: '#8e8e8e', bg: 'rgba(142,142,142,0.12)' },
  sanguo:    { color: '#d35c8a', bg: 'rgba(211,92,138,0.12)' },
  dragonball:{ color: '#e86432', bg: 'rgba(232,100,50,0.12)' },
};

export default function ScenePage() {
  const [scenes, setScenes] = useState<GameSceneData[]>([]);
  const [playerLevel, setPlayerLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState<string | null>(null);

  useEffect(() => {
    fetchScenes()
      .then(res => { setScenes(res.scenes || []); setPlayerLevel(res.playerLevel); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEnter = useCallback(async (scene: GameSceneData) => {
    if (!scene.unlocked || entering) return;
    setEntering(scene.sceneId);
    try {
      const res = await enterScene(scene.sceneId);
      if (res.entered) {
        toast.success(`已进入${res.name}`);
      }
    } catch {
      toast.error('进入场景失败');
    }
    setEntering(null);
  }, [entering]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}><h2 className={styles.title}>场景</h2></div>
        <div className={styles.empty}><p>加载中...</p></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>场景穿梭</h2>
        <p className={styles.subtitle}>当前等级 Lv.{playerLevel} · 解锁更高等级场景获取更多奖励</p>
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.cardList}>
          {scenes.map(scene => {
            const theme = SCENE_THEMES[scene.sceneId] || SCENE_THEMES.adventure;
            const locked = !scene.unlocked;
            const vars = { '--scene-color': theme.color, '--scene-bg': theme.bg } as React.CSSProperties;
            return (
              <div key={scene.sceneId}
                className={`${styles.card} ${locked ? styles.cardLocked : styles.cardThemed}`}
                style={locked ? undefined : vars}>
                <div className={styles.cardRow}>
                  <div className={styles.cardBody}>
                    <p className={`${styles.cardTitle} ${locked ? '' : styles.cardTitleThemed}`}>
                      {scene.name}
                    </p>
                    <p className={styles.cardMeta}>
                      需要等级 Lv.{scene.requiredLevel}
                      {locked && ` · 还需${scene.requiredLevel - playerLevel}级`}
                    </p>
                    <p className={styles.cardDesc}>{scene.description}</p>
                  </div>
                  <button className={`${styles.actionBtn} ${locked ? styles.actionBtnLocked : styles.actionBtnThemed}`}
                    disabled={locked || entering === scene.sceneId}
                    onClick={() => handleEnter(scene)}>
                    {entering === scene.sceneId ? '...' : locked ? '未解锁' : '进入'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {scenes.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>🗺️</span>
            <p>暂无可用场景</p>
          </div>
        )}
      </div>
    </div>
  );
}
