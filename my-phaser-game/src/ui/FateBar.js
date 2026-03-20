/**
 * FateBar.js
 * 缘分条组件
 * 显示 NPC 好感度（0-100），金色填充
 */

import { GOLD, PAPER } from './DialogueBox.js';

export default class FateBar {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x       左边 x
     * @param {number} y       顶部 y
     * @param {number} width
     * @param {number} height  (default 6)
     */
    constructor(scene, x, y, width, height = 6) {
        this.scene  = scene;
        this.x      = x;
        this.y      = y;
        this.width  = width;
        this.height = height;
        this._value = 0;
        this._max   = 100;

        this._build();
    }

    _build() {
        const s = this.scene;

        // 背景轨道
        this.track = s.add.graphics();
        this.track.fillStyle(0x2a2218, 1);
        this.track.fillRoundedRect(this.x, this.y, this.width, this.height, this.height / 2);
        this.track.lineStyle(1, GOLD, 0.3);
        this.track.strokeRoundedRect(this.x, this.y, this.width, this.height, this.height / 2);
        this.track.setDepth(3);

        // 填充
        this.fill = s.add.graphics();
        this.fill.setDepth(4);

        // 文字标签
        this.label = s.add.text(this.x, this.y - 16, '缘分　0 / 100', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: '#c9a84c',
        });
        this.label.setDepth(4);

        this._draw();
    }

    _draw() {
        this.fill.clear();
        const ratio = Math.min(Math.max(this._value / this._max, 0), 1);
        const w = Math.max(4, this.width * ratio);
        this.fill.fillStyle(GOLD, 1);
        this.fill.fillRoundedRect(this.x, this.y, w, this.height, this.height / 2);
    }

    /**
     * 设置缘分值（0-100）
     */
    setValue(val) {
        this._value = val;
        this.label.setText(`缘分　${val} / ${this._max}`);
        this._draw();
    }

    /**
     * 带动画设置值
     */
    animateTo(val, duration = 600) {
        const start = this._value;
        const end   = val;
        this.scene.tweens.addCounter({
            from: start,
            to:   end,
            duration,
            ease: 'Sine.easeOut',
            onUpdate: tween => {
                this._value = Math.round(tween.getValue());
                this._draw();
                this.label.setText(`缘分　${this._value} / ${this._max}`);
            },
        });
    }

    setVisible(v) {
        this.track.setVisible(v);
        this.fill.setVisible(v);
        this.label.setVisible(v);
    }

    setDepth(d) {
        this.track.setDepth(d);
        this.fill.setDepth(d + 1);
        this.label.setDepth(d + 1);
    }

    destroy() {
        this.track.destroy();
        this.fill.destroy();
        this.label.destroy();
    }
}
