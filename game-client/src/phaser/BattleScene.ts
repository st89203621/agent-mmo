import Phaser from 'phaser';

/**
 * 战斗场景 — 全屏沉浸式特效引擎
 * 根据 effectType 播放不同视觉效果：
 * - physical_damage: 斩击（刀光 + 冲击波）
 * - magic_damage: 魔法爆发（蓝紫冲击波 + 粒子）
 * - heal: 治疗光柱（绿色上升粒子）
 * - buff_defense: 六边形护盾
 * - fire_damage: 火焰爆炸（橙红粒子 + 火环）
 * - ice_damage: 冰霜冲击（冰蓝碎片 + 冻结环）
 */
export default class BattleScene extends Phaser.Scene {
  private elapsed = 0;
  private groundGfx!: Phaser.GameObjects.Graphics;

  constructor() { super({ key: 'BattleScene' }); }

  create() {
    const { width, height } = this.scale;

    // 粒子纹理
    this.makeGlowTex('p_white', 6, 0xffffff);
    this.makeGlowTex('p_spark', 4, 0xffdd55);
    this.makeGlowTex('p_magic', 7, 0x7799ff);
    this.makeGlowTex('p_violet', 6, 0xcc66ff);
    this.makeGlowTex('p_fire', 6, 0xff7733);
    this.makeGlowTex('p_heal', 7, 0x55ffaa);
    this.makeGlowTex('p_shield', 6, 0x44ddff);
    this.makeGlowTex('p_dust', 3, 0x5533aa);
    this.makeGlowTex('p_ember', 3, 0xaa5522);
    this.makeGlowTex('p_ice', 6, 0x88ddff);
    this.makeGlowTex('p_flame', 5, 0xff4400);
    this.makeGlowTex('p_gold', 5, 0xffcc00);

    // 飘浮尘埃
    this.add.particles(0, 0, 'p_dust', {
      x: { min: 0, max: width }, y: { min: 0, max: height },
      lifespan: { min: 6000, max: 12000 }, speed: { min: 4, max: 14 },
      angle: { min: 248, max: 292 }, scale: { start: 1, end: 0 },
      alpha: { start: 0.28, end: 0 }, frequency: 200,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(0);

    // 底部余烬
    this.add.particles(0, 0, 'p_ember', {
      x: { min: 0, max: width }, y: height,
      lifespan: { min: 3000, max: 7000 }, speed: { min: 10, max: 25 },
      angle: { min: 263, max: 277 }, scale: { start: 0.7, end: 0 },
      alpha: { start: 0.22, end: 0 }, frequency: 220,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(0);

    this.groundGfx = this.add.graphics().setDepth(1);
  }

  update(_t: number, delta: number) {
    this.elapsed += delta;
    this.drawGroundLine();
  }

  /** 根据 effectType 播放对应特效 */
  playEffect(effectType: string, x: number, y: number) {
    switch (effectType) {
      case 'physical_damage': this.playSlash(x, y); break;
      case 'magic_damage': this.playMagic(x, y); break;
      case 'heal': this.playHeal(x, y); break;
      case 'buff_defense': this.playShield(x, y); break;
      case 'fire_damage': this.playFire(x, y); break;
      case 'ice_damage': this.playIce(x, y); break;
      default: this.playSlash(x, y); break;
    }
  }

  /* ── 斩击特效 ── */
  playSlash(x: number, y: number) {
    const slashes = [
      { x1: x - 80, y1: y - 55, x2: x + 80, y2: y + 55, color: 0xffffff, lw: 3.5, alpha: 1.0 },
      { x1: x - 65, y1: y + 35, x2: x + 65, y2: y - 35, color: 0xffeecc, lw: 2, alpha: 0.75 },
      { x1: x - 50, y1: y - 20, x2: x + 50, y2: y + 20, color: 0xffffff, lw: 1.5, alpha: 0.5 },
    ];
    for (const s of slashes) {
      const g = this.add.graphics().setDepth(12);
      g.lineStyle(s.lw, s.color, s.alpha);
      g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.strokePath();
      this.tweens.add({ targets: g, alpha: 0, scaleX: 1.3, scaleY: 1.3, duration: 320, ease: 'Power2', onComplete: () => g.destroy() });
    }

    const ring = this.add.graphics().setDepth(12);
    ring.lineStyle(2.5, 0xffffff, 0.8);
    ring.strokeCircle(x, y, 25);
    this.tweens.add({ targets: ring, alpha: 0, scaleX: 3, scaleY: 3, duration: 380, ease: 'Power2', onComplete: () => ring.destroy() });

    this.add.particles(x, y, 'p_white', {
      speed: { min: 80, max: 250 }, angle: { min: -50, max: 50 },
      lifespan: { min: 150, max: 450 }, scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 }, quantity: 24, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(24, x, y);

    this.add.particles(x, y, 'p_spark', {
      speed: { min: 40, max: 180 }, angle: { min: 0, max: 360 },
      lifespan: { min: 350, max: 800 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 }, quantity: 18, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(18, x, y);

    this.cameras.main.flash(70, 255, 255, 255, false);
    this.cameras.main.shake(280, 0.014);
  }

  /* ── 魔法爆发特效 ── */
  playMagic(x: number, y: number) {
    const rings = [
      { delay: 0, color: 0x6699ff, r: 12, lw: 3, a: 1.0, dur: 580 },
      { delay: 90, color: 0xcc66ff, r: 8, lw: 2, a: 0.75, dur: 520 },
      { delay: 180, color: 0x88ccff, r: 5, lw: 1.5, a: 0.55, dur: 460 },
    ];
    for (const rc of rings) {
      this.time.delayedCall(rc.delay, () => {
        const ring = this.add.graphics().setDepth(12);
        ring.lineStyle(rc.lw, rc.color, rc.a);
        ring.strokeCircle(x, y, rc.r);
        this.tweens.add({ targets: ring, alpha: 0, scaleX: 5.5, scaleY: 5.5, duration: rc.dur, ease: 'Power2', onComplete: () => ring.destroy() });
      });
    }

    const core = this.add.graphics().setDepth(13);
    core.fillStyle(0xaaccff, 0.7);
    core.fillCircle(x, y, 18);
    this.tweens.add({ targets: core, alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 220, ease: 'Power3', onComplete: () => core.destroy() });

    this.add.particles(x, y, 'p_magic', {
      speed: { min: 60, max: 210 }, angle: { min: 0, max: 360 },
      lifespan: { min: 450, max: 950 }, scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 }, quantity: 32, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(32, x, y);

    this.add.particles(x, y, 'p_violet', {
      speed: { min: 30, max: 110 }, angle: { min: 0, max: 360 },
      lifespan: { min: 300, max: 650 }, scale: { start: 1.1, end: 0 },
      alpha: { start: 0.8, end: 0 }, quantity: 20, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(20, x, y);

    this.cameras.main.flash(110, 80, 130, 255, false);
    this.cameras.main.shake(200, 0.009);
  }

  /* ── 治疗光柱特效 ── */
  playHeal(x: number, y: number) {
    const pillar = this.add.graphics().setDepth(11);
    pillar.fillStyle(0x55ffaa, 0.08);
    pillar.fillRect(x - 22, y - 120, 44, 120);
    pillar.fillStyle(0x55ffaa, 0.18);
    pillar.fillRect(x - 10, y - 120, 20, 120);
    this.tweens.add({ targets: pillar, alpha: 0, duration: 950, ease: 'Power1', onComplete: () => pillar.destroy() });

    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 130, () => {
        const ring = this.add.graphics().setDepth(12);
        ring.lineStyle(2, 0x44ff88, 0.85 - i * 0.18);
        ring.strokeCircle(x, y, 14);
        this.tweens.add({ targets: ring, alpha: 0, scaleX: 3.5 + i * 0.5, scaleY: 3.5 + i * 0.5, duration: 650, ease: 'Power2', onComplete: () => ring.destroy() });
      });
    }

    this.add.particles(x, y, 'p_heal', {
      speed: { min: 35, max: 90 }, angle: { min: 255, max: 285 },
      lifespan: { min: 900, max: 1600 }, scale: { start: 1.1, end: 0 },
      alpha: { start: 0.85, end: 0 }, quantity: 22, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(22, x, y);

    this.cameras.main.flash(160, 40, 220, 110, false);
  }

  /* ── 防御护盾特效 ── */
  playShield(x: number, y: number) {
    this.drawHex(x, y, 52, 0x44ccff, 3, 0.95, 12);
    this.time.delayedCall(110, () => this.drawHex(x, y, 42, 0x88eeff, 1.5, 0.6, 12));
    this.time.delayedCall(220, () => this.drawHex(x, y, 32, 0xaaffff, 1, 0.35, 12));

    this.add.particles(x, y, 'p_shield', {
      speed: { min: 25, max: 75 }, angle: { min: 0, max: 360 },
      lifespan: { min: 650, max: 1300 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 0.8, end: 0 }, quantity: 20, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(20, x, y);

    this.cameras.main.flash(110, 40, 190, 255, false);
  }

  /* ── 火焰爆炸特效 ── */
  playFire(x: number, y: number) {
    // 火焰核心爆炸
    const core = this.add.graphics().setDepth(13);
    core.fillStyle(0xff6600, 0.9);
    core.fillCircle(x, y, 22);
    this.tweens.add({ targets: core, alpha: 0, scaleX: 3, scaleY: 3, duration: 400, ease: 'Power2', onComplete: () => core.destroy() });

    // 双层火环
    for (let i = 0; i < 2; i++) {
      this.time.delayedCall(i * 80, () => {
        const ring = this.add.graphics().setDepth(12);
        ring.lineStyle(3 - i, 0xff4400 + i * 0x002200, 0.9 - i * 0.2);
        ring.strokeCircle(x, y, 15 + i * 5);
        this.tweens.add({ targets: ring, alpha: 0, scaleX: 4.5, scaleY: 4.5, duration: 500, ease: 'Power2', onComplete: () => ring.destroy() });
      });
    }

    // 火焰粒子向外
    this.add.particles(x, y, 'p_flame', {
      speed: { min: 80, max: 280 }, angle: { min: 0, max: 360 },
      lifespan: { min: 300, max: 800 }, scale: { start: 1.6, end: 0 },
      alpha: { start: 1, end: 0 }, quantity: 36, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(36, x, y);

    // 火花飞溅
    this.add.particles(x, y, 'p_spark', {
      speed: { min: 50, max: 200 }, angle: { min: 230, max: 310 },
      lifespan: { min: 500, max: 1200 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 }, quantity: 18, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(18, x, y);

    this.cameras.main.flash(100, 255, 120, 30, false);
    this.cameras.main.shake(300, 0.016);
  }

  /* ── 冰霜冲击特效 ── */
  playIce(x: number, y: number) {
    // 冰霜中心
    const core = this.add.graphics().setDepth(13);
    core.fillStyle(0x88ddff, 0.6);
    core.fillCircle(x, y, 16);
    this.tweens.add({ targets: core, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 350, ease: 'Power2', onComplete: () => core.destroy() });

    // 冰环扩散（3层）
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 100, () => {
        const ring = this.add.graphics().setDepth(12);
        ring.lineStyle(2.5 - i * 0.5, 0x66ccff, 0.9 - i * 0.2);
        ring.strokeCircle(x, y, 10 + i * 4);
        this.tweens.add({ targets: ring, alpha: 0, scaleX: 4, scaleY: 4, duration: 550, ease: 'Power2', onComplete: () => ring.destroy() });
      });
    }

    // 冰霜碎片粒子
    this.add.particles(x, y, 'p_ice', {
      speed: { min: 40, max: 180 }, angle: { min: 0, max: 360 },
      lifespan: { min: 500, max: 1100 }, scale: { start: 1.3, end: 0 },
      alpha: { start: 0.9, end: 0 }, quantity: 28, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(28, x, y);

    // 白色冰晶
    this.add.particles(x, y, 'p_white', {
      speed: { min: 20, max: 80 }, angle: { min: 240, max: 300 },
      lifespan: { min: 800, max: 1400 }, scale: { start: 0.7, end: 0 },
      alpha: { start: 0.7, end: 0 }, quantity: 14, blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).explode(14, x, y);

    this.cameras.main.flash(120, 140, 220, 255, false);
    this.cameras.main.shake(180, 0.008);
  }

  /** 受击全屏红闪 */
  flashHit() {
    this.cameras.main.flash(220, 210, 40, 40, false);
    this.cameras.main.shake(220, 0.011);
  }

  /** 胜利双段金闪 */
  flashVictory() {
    this.cameras.main.flash(450, 220, 180, 50, false);
    this.time.delayedCall(220, () => this.cameras.main.flash(320, 220, 160, 40, false));
  }

  /* ── 内部方法 ── */

  private drawGroundLine() {
    const { width, height } = this.scale;
    const y = height * 0.48;
    const pulse = 0.35 + Math.sin(this.elapsed * 0.0014) * 0.18;
    const g = this.groundGfx;
    g.clear();

    g.lineStyle(8, 0xc9a84c, pulse * 0.08);
    g.beginPath(); g.moveTo(0, y); g.lineTo(width, y); g.strokePath();

    g.lineStyle(1.5, 0xc9a84c, pulse);
    g.beginPath(); g.moveTo(width * 0.08, y); g.lineTo(width * 0.92, y); g.strokePath();

    const d = 4.5 + Math.sin(this.elapsed * 0.002) * 1.8;
    g.fillStyle(0xc9a84c, pulse * 1.2);
    g.beginPath();
    g.moveTo(width * 0.5, y - d);
    g.lineTo(width * 0.5 + d * 0.7, y);
    g.lineTo(width * 0.5, y + d);
    g.lineTo(width * 0.5 - d * 0.7, y);
    g.closePath();
    g.fillPath();
  }

  private drawHex(cx: number, cy: number, r: number, color: number, lw: number, alpha: number, depth: number) {
    const g = this.add.graphics().setDepth(depth);
    g.lineStyle(lw, color, alpha);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.DegToRad(60 * i - 30);
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, scaleX: 2, scaleY: 2, duration: 620, ease: 'Power2', onComplete: () => g.destroy() });
  }

  private makeGlowTex(key: string, radius: number, color: number) {
    const size = radius * 5;
    const g = this.add.graphics();
    g.fillStyle(color, 0.12); g.fillCircle(size / 2, size / 2, radius * 2.2);
    g.fillStyle(color, 0.35); g.fillCircle(size / 2, size / 2, radius * 1.4);
    g.fillStyle(color, 1); g.fillCircle(size / 2, size / 2, radius);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
