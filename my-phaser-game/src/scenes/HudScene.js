/**
 * HudScene.js
 * 底部导航常驻场景（与主场景并行运行）
 */

import BottomNav from '../ui/BottomNav.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;

const NAV_H = 56;

export default class HudScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HudScene' });
        this._nav = null;
    }

    preload() {}

    create() {
        const H = this.scale.height;
        const W = this.scale.width;

        // 底部导航
        this._nav = new BottomNav(this, H - NAV_H);

        // 监听主场景切换事件（其他场景可以广播这个事件）
        this.game.events.on('setNavActive', (key) => {
            if (this._nav) this._nav.setActive(key);
        });
    }

    update() {}

    destroy() {
        if (this._nav) {
            this._nav.destroy();
            this._nav = null;
        }
    }
}
