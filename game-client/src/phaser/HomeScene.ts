import Phaser from 'phaser';

/**
 * 主页氛围场景
 * - 墨色背景 + 中心呼吸光晕
 * - 全屏漂浮金色光粒
 * - 立绘区域环绕粒子流（从底部向上飘散，模拟灵气/仙尘）
 * - 偶发亮光闪烁
 */
export default class HomeScene extends Phaser.Scene {
  private glowGfx!: Phaser.GameObjects.Graphics;
  private elapsed = 0;

  constructor() {
    super({ key: 'HomeScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 纯色背景
    const bg = this.add.graphics();
    bg.fillStyle(0x0e0b09, 1);
    bg.fillRect(0, 0, width, height);

    // 中心呼吸光晕
    this.glowGfx = this.add.graphics().setDepth(0);

    // 粒子纹理
    this.makeCircleTex('ember', 6, 0xc9a84c);
    this.makeCircleTex('dust', 3, 0xa68a3a);
    this.makeCircleTex('spark', 4, 0xf0dca0);
    this.makeCircleTex('aura', 5, 0xd4b060);

    // ① 全屏漂浮金色光粒
    this.add.particles(0, 0, 'ember', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: { min: 4000, max: 8000 },
      speed: { min: 8, max: 22 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      frequency: 220,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(1);

    // ② 微尘缓慢飘动
    this.add.particles(0, 0, 'dust', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: { min: 6000, max: 12000 },
      speed: { min: 2, max: 8 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.25, end: 0 },
      frequency: 450,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(1);

    // ③ 立绘区域灵气上升流 — 从画面中下部向上飘散
    const cx = width * 0.5;
    const portraitBottom = height * 0.62;
    this.add.particles(0, 0, 'aura', {
      x: { min: cx - 100, max: cx + 100 },
      y: { min: portraitBottom - 20, max: portraitBottom + 10 },
      lifespan: { min: 2000, max: 4000 },
      speed: { min: 15, max: 40 },
      angle: { min: 260, max: 280 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.5, end: 0 },
      frequency: 160,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(2);

    // ④ 偶发闪光火花
    this.add.particles(0, 0, 'spark', {
      x: { min: cx - 120, max: cx + 120 },
      y: { min: height * 0.25, max: portraitBottom },
      lifespan: { min: 600, max: 1200 },
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      frequency: 1500,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(2);

    // 响应尺寸
    this.scale.on('resize', (gs: Phaser.Structs.Size) => {
      bg.clear();
      bg.fillStyle(0x0e0b09, 1);
      bg.fillRect(0, 0, gs.width, gs.height);
    });
  }

  update(_t: number, delta: number) {
    this.elapsed += delta;
    const pulse = 0.1 + Math.sin(this.elapsed * 0.0008) * 0.06;
    this.drawGlow(pulse);
  }

  private drawGlow(alpha: number) {
    const { width, height } = this.scale;
    const cx = width * 0.5;
    const cy = height * 0.38;
    const g = this.glowGfx;
    g.clear();
    for (const { r, a, c } of [
      { r: 200, a: alpha * 0.12, c: 0xc9a84c },
      { r: 130, a: alpha * 0.2, c: 0xc9a84c },
      { r: 60, a: alpha * 0.3, c: 0xd4b85c },
    ]) {
      g.fillStyle(c, a);
      g.fillCircle(cx, cy, r);
    }
  }

  private makeCircleTex(key: string, radius: number, color: number) {
    const s = radius * 2 + 4;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(radius + 2, radius + 2, radius);
    g.generateTexture(key, s, s);
    g.destroy();
  }
}
