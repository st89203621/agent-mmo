import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { fetchNpcs } from '../../services/api';
import ExploreScene, { type SceneNpc } from './explore/ExploreScene';
import styles from './ExplorePage.module.css';

/** NPC在地图上的固定位置（如后端未提供坐标则按顺序分配） */
const NPC_POSITIONS = [
  { col: 8, row: 5 },
  { col: 14, row: 3 },
  { col: 5, row: 10 },
  { col: 16, row: 9 },
  { col: 10, row: 12 },
  { col: 3, row: 7 },
  { col: 12, row: 7 },
];

const NPC_COLORS = [0xc44e52, 0x55a5db, 0x8bc563, 0xd4a84b, 0xb07cc7, 0xe88c5a, 0x6ec5b8];

export default function ExplorePage() {
  const { currentBookWorld, navigateTo } = useGameStore();
  const { currentWorldIndex } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [playerPos, setPlayerPos] = useState({ col: 3, row: 3 });
  const [sceneNpcs, setSceneNpcs] = useState<SceneNpc[]>([]);
  const [ready, setReady] = useState(false);

  // 加载NPC
  useEffect(() => {
    fetchNpcs(currentWorldIndex)
      .then((res) => {
        const npcs: SceneNpc[] = res.npcs.map((npc, i) => ({
          npcId: npc.npcId,
          npcName: npc.npcName,
          col: NPC_POSITIONS[i % NPC_POSITIONS.length].col,
          row: NPC_POSITIONS[i % NPC_POSITIONS.length].row,
          color: NPC_COLORS[i % NPC_COLORS.length],
        }));
        setSceneNpcs(npcs);
        setReady(true);
      })
      .catch(() => {
        setReady(true); // 即使失败也渲染空地图
      });
  }, [currentWorldIndex]);

  const handleNpcInteract = useCallback((npcId: string) => {
    navigateTo('story', { autoStartNpcId: npcId });
  }, [navigateTo]);

  const handlePositionChange = useCallback((col: number, row: number) => {
    setPlayerPos((prev) => {
      if (prev.col === col && prev.row === row) return prev;
      return { col, row };
    });
  }, []);

  // 初始化Phaser
  useEffect(() => {
    if (!ready || !containerRef.current) return;

    // 清除旧实例
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: containerRef.current,
      width,
      height,
      backgroundColor: '#1a1610',
      scene: ExploreScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        touch: true,
      },
      audio: { noAudio: true },
    });

    // 等scene ready后传数据
    game.events.on('ready', () => {
      const scene = game.scene.getScene('ExploreScene') as ExploreScene;
      if (scene) {
        scene.scene.restart({
          npcs: sceneNpcs,
          callbacks: {
            onNpcInteract: handleNpcInteract,
            onPositionChange: handlePositionChange,
          },
        });
      }
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [ready, sceneNpcs, handleNpcInteract, handlePositionChange]);

  // 简易小地图：5x5网格以玩家为中心
  const minimapDots = useMemo(() => {
    const dots: { key: string; cls: string }[] = [];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = playerPos.row + dr;
        const c = playerPos.col + dc;
        const isPlayer = dr === 0 && dc === 0;
        const isNpc = sceneNpcs.some((n) => n.col === c && n.row === r);
        let cls = styles.mapDot;
        if (isPlayer) cls += ` ${styles.mapDotPlayer}`;
        else if (isNpc) cls += ` ${styles.mapDotNpc}`;
        dots.push({ key: `${dr}_${dc}`, cls });
      }
    }
    return dots;
  }, [playerPos, sceneNpcs]);

  if (!ready) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>加载场景...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.sceneName}>
          {currentBookWorld?.title || '太古'} · 探索
        </span>
        <span className={styles.posLabel}>
          ({playerPos.col}, {playerPos.row})
        </span>
      </div>

      <div className={styles.canvasWrap} ref={containerRef} />

      <div className={styles.minimap}>
        <div className={styles.minimapGrid}>
          {minimapDots.map((d) => (
            <div key={d.key} className={d.cls} />
          ))}
        </div>
      </div>
    </div>
  );
}
