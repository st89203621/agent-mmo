import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

/**
 * 在指定 DOM 容器中启动 Phaser 实例，组件卸载时自动销毁
 */
export function usePhaserGame(
  containerRef: React.RefObject<HTMLDivElement | null>,
  scenes: (typeof Phaser.Scene)[],
) {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: el,
      transparent: true,
      width: el.clientWidth,
      height: el.clientHeight,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: scenes,
      audio: { noAudio: true },
      banner: false,
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return gameRef;
}
