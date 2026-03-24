import Phaser from 'phaser';

/**
 * 主页氛围场景 —— 漂浮的金色光粒 + 墨色背景 + 呼吸光晕
 * 纯视觉装饰层，不处理任何交互
 */
export default class HomeScene extends Phaser.Scene {
  private embers!: Phaser.GameObjects.Particles.ParticleEmitter;
  private glowCircle!: Phaser.GameObjects.Graphics;
  private time_acc = 0;

  constructor() {
    super({ key: 'HomeScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 径向渐变背景
    const bg = this.add.graphics();
    bg.fillStyle(0x0e0b09, 1);
    bg.fillRect(0, 0, width, height);

    // 中心呼吸光晕
    this.glowCircle = this.add.graphics();
    this.drawGlow(0.15);

    // 生成粒子纹理 — 小圆点
    this.createParticleTexture('ember', 6, 0xc9a84c);
    this.createParticleTexture('dust', 3, 0xa68a3a);

    // 金色光粒漂浮
    this.embers = this.add.particles(0, 0, 'ember', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: { min: 4000, max: 8000 },
      speed: { min: 8, max: 25 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.7, end: 0 },
      frequency: 200,
      blendMode: Phaser.BlendModes.ADD,
    });

    // 微尘
    this.add.particles(0, 0, 'dust', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: { min: 6000, max: 12000 },
      speed: { min: 3, max: 10 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.3, end: 0 },
      frequency: 400,
      blendMode: Phaser.BlendModes.ADD,
    });

    // 响应尺寸变化
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      bg.clear();
      bg.fillStyle(0x0e0b09, 1);
      bg.fillRect(0, 0, gameSize.width, gameSize.height);
      this.embers.setPosition(0, 0);
    });
  }

  update(_time: number, delta: number) {
    this.time_acc += delta;
    const pulse = 0.12 + Math.sin(this.time_acc * 0.001) * 0.06;
    this.drawGlow(pulse);
  }

  private drawGlow(alpha: number) {
    const { width, height } = this.scale;
    const cx = width * 0.5;
    const cy = height * 0.38;
    const g = this.glowCircle;
    g.clear();

    // 多层圆形渐变模拟光晕
    const layers = [
      { r: 180, a: alpha * 0.15, color: 0xc9a84c },
      { r: 120, a: alpha * 0.25, color: 0xc9a84c },
      { r: 60, a: alpha * 0.35, color: 0xd4b85c },
    ];
    for (const l of layers) {
      g.fillStyle(l.color, l.a);
      g.fillCircle(cx, cy, l.r);
    }
  }

  private createParticleTexture(key: string, radius: number, color: number) {
    const size = radius * 2 + 4;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(radius + 2, radius + 2, radius);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
