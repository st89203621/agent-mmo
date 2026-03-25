import Phaser from 'phaser';

/**
 * 战斗场景 Phaser Scene
 * - 战场氛围粒子（暗色漂浮尘埃 + 偶发火花）
 * - 技能特效（斩击/魔法/治疗/防御）
 * - 被击闪烁、受伤屏幕震动
 * - 地面分割线光效
 */
export default class BattleScene extends Phaser.Scene {
  private elapsed = 0;
  private groundGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 粒子纹理
    this.makeCircleTex('b_ember', 4, 0x8866aa);
    this.makeCircleTex('b_dust', 2, 0x554466);
    this.makeCircleTex('b_spark', 5, 0xffcc44);
    this.makeCircleTex('b_magic', 6, 0x6699ff);
    this.makeCircleTex('b_fire', 5, 0xff6644);
    this.makeCircleTex('b_heal', 5, 0x44ff88);
    this.makeCircleTex('b_shield', 6, 0x44ccff);
    this.makeCircleTex('b_slash', 3, 0xffffff);

    // ① 战场暗色漂浮尘埃
    this.add.particles(0, 0, 'b_dust', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: { min: 5000, max: 10000 },
      speed: { min: 3, max: 10 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.2, end: 0 },
      frequency: 400,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(0);

    // ② 微弱紫色氛围光粒
    this.add.particles(0, 0, 'b_ember', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: { min: 3000, max: 6000 },
      speed: { min: 5, max: 15 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.3, end: 0 },
      frequency: 600,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(0);

    // 地面光线
    this.groundGfx = this.add.graphics().setDepth(1);
  }

  update(_t: number, delta: number) {
    this.elapsed += delta;
    this.drawGroundLine();
  }

  /** 地面分割线呼吸光效 */
  private drawGroundLine() {
    const { width, height } = this.scale;
    const y = height * 0.48;
    const pulse = 0.3 + Math.sin(this.elapsed * 0.001) * 0.15;
    const g = this.groundGfx;
    g.clear();
    g.lineStyle(2, 0xc9a84c, pulse);
    g.beginPath();
    g.moveTo(width * 0.1, y);
    g.lineTo(width * 0.9, y);
    g.strokePath();
    // 中心光点
    g.fillStyle(0xc9a84c, pulse * 1.5);
    g.fillCircle(width * 0.5, y, 3);
  }

  /* ── 技能特效（由React调用） ── */

  /** 物理斩击特效 */
  playSlash(x: number, y: number) {
    const { width } = this.scale;
    // 斩击弧线粒子
    this.add.particles(x, y, 'b_slash', {
      speed: { min: 80, max: 200 },
      angle: { min: -30, max: 30 },
      lifespan: { min: 200, max: 500 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      quantity: 15,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).explode(15, x, y);

    // 火花
    this.add.particles(x, y, 'b_spark', {
      speed: { min: 40, max: 120 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 8,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).explode(8, x, y);

    // 屏幕震动
    this.cameras.main.shake(200, 0.008);

    // 斩击光弧 — 用graphics画弧线
    const arc = this.add.graphics().setDepth(10);
    arc.lineStyle(3, 0xffffff, 0.8);
    arc.beginPath();
    arc.arc(x, y, 50, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60), false);
    arc.strokePath();
    this.tweens.add({
      targets: arc,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
      onComplete: () => arc.destroy(),
    });
  }

  /** 魔法爆发特效 */
  playMagic(x: number, y: number) {
    // 蓝色魔法粒子爆发
    this.add.particles(x, y, 'b_magic', {
      speed: { min: 30, max: 100 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 400, max: 800 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      quantity: 20,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).explode(20, x, y);

    // 魔法环
    const ring = this.add.graphics().setDepth(10);
    ring.lineStyle(2, 0x6699ff, 0.9);
    ring.strokeCircle(x, y, 20);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 600,
      onComplete: () => ring.destroy(),
    });

    // 第二层环（延迟）
    this.time.delayedCall(150, () => {
      const ring2 = this.add.graphics().setDepth(10);
      ring2.lineStyle(1.5, 0x99bbff, 0.6);
      ring2.strokeCircle(x, y, 15);
      this.tweens.add({
        targets: ring2,
        alpha: 0,
        scaleX: 2.5,
        scaleY: 2.5,
        duration: 500,
        onComplete: () => ring2.destroy(),
      });
    });

    this.cameras.main.shake(150, 0.005);
  }

  /** 治疗光柱特效 */
  playHeal(x: number, y: number) {
    // 绿色上升粒子
    this.add.particles(x, y, 'b_heal', {
      speed: { min: 20, max: 60 },
      angle: { min: 260, max: 280 },
      lifespan: { min: 600, max: 1200 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.7, end: 0 },
      quantity: 15,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).explode(15, x, y);

    // 光柱
    const pillar = this.add.graphics().setDepth(10);
    pillar.fillStyle(0x44ff88, 0.15);
    pillar.fillRect(x - 20, y - 80, 40, 80);
    this.tweens.add({
      targets: pillar,
      alpha: 0,
      duration: 800,
      onComplete: () => pillar.destroy(),
    });
  }

  /** 防御护盾特效 */
  playShield(x: number, y: number) {
    this.add.particles(x, y, 'b_shield', {
      speed: { min: 10, max: 30 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 500, max: 1000 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.6, end: 0 },
      quantity: 12,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).explode(12, x, y);

    // 护盾圆弧
    const shield = this.add.graphics().setDepth(10);
    shield.lineStyle(2.5, 0x44ccff, 0.8);
    shield.beginPath();
    shield.arc(x, y, 40, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(90), false);
    shield.strokePath();
    this.tweens.add({
      targets: shield,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 600,
      onComplete: () => shield.destroy(),
    });
  }

  /** 被击闪烁 — 全屏红色闪光 */
  flashHit() {
    this.cameras.main.flash(200, 180, 40, 40, false);
    this.cameras.main.shake(150, 0.006);
  }

  /** 全屏胜利金色闪光 */
  flashVictory() {
    this.cameras.main.flash(400, 200, 168, 76, false);
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
