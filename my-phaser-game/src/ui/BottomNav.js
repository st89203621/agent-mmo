/**
 * BottomNav.js
 * 底部导航 UI 组件（在 HudScene 中使用）
 */

import { GOLD, PAPER, INK } from './DialogueBox.js';

const NAV_ITEMS = [
    { key: 'explore',   label: '探索', scene: 'ExploreScene'   },
    { key: 'story',     label: '剧情', scene: 'StoryScene'     },
    { key: 'character', label: '人物', scene: 'CharacterScene' },
    { key: 'bag',       label: '背包', scene: 'BagScene'       },
    { key: 'fate',      label: '因缘', scene: 'FateMapScene'   },
];

export default class BottomNav {
    /**
     * @param {Phaser.Scene} scene  HudScene 实例
     * @param {number} y            底部 y 起始位置
     */
    constructor(scene, y) {
        this.scene   = scene;
        this.y       = y;
        this.width   = 390;
        this.height  = 56;
        this._active = 'explore';
        this._buttons = [];
        this._build();
    }

    _build() {
        const s      = this.scene;
        const btnW   = this.width / NAV_ITEMS.length;
        const y      = this.y;

        // 背景
        this.bg = s.add.graphics();
        this.bg.fillStyle(0x110e0b, 0.96);
        this.bg.fillRect(0, y, this.width, this.height);
        this.bg.lineStyle(1, GOLD, 0.3);
        this.bg.lineBetween(0, y, this.width, y);
        this.bg.setDepth(50);

        NAV_ITEMS.forEach((item, i) => {
            const cx = btnW * i + btnW / 2;
            const cy = y + this.height / 2;

            // 点击区域
            const zone = s.add.zone(cx, cy, btnW, this.height).setInteractive();
            zone.setDepth(52);

            // 图标占位（用小方形模拟图标）
            const icon = s.add.graphics();
            icon.fillStyle(GOLD, 0.3);
            icon.fillRect(cx - 10, y + 8, 20, 16);
            icon.setDepth(51);

            // 文字
            const label = s.add.text(cx, y + 38, item.label, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '11px',
                color: '#907040',
            }).setOrigin(0.5, 0.5).setDepth(51);

            // 激活指示线
            const activeLine = s.add.graphics();
            activeLine.fillStyle(GOLD, 1);
            activeLine.fillRect(cx - 16, y + 1, 32, 2);
            activeLine.setDepth(51);
            activeLine.setVisible(false);

            zone.on('pointerdown', () => {
                this._onNavClick(item, i);
            });

            this._buttons.push({ item, zone, icon, label, activeLine, cx, cy, index: i });
        });

        this._updateActive();
    }

    _onNavClick(item, index) {
        this._active = item.key;
        this._updateActive();

        // 通过 scene manager 切换场景（保留 HudScene）
        const sm = this.scene.scene;
        // 停止当前非Hud场景
        const allScenes = ['BootScene','StoryScene','BattleScene','ExploreScene',
            'MemoryScene','RebirthScene','CharacterScene','EnchantScene',
            'SkillScene','BagScene','PetScene','BookSelectScene','FateMapScene'];
        allScenes.forEach(k => { if (sm.isActive(k)) sm.stop(k); });

        sm.launch(item.scene);
        sm.bringToTop('HudScene');
    }

    _updateActive() {
        this._buttons.forEach(btn => {
            const isActive = btn.item.key === this._active;
            btn.label.setColor(isActive ? '#c9a84c' : '#907040');
            btn.icon.clear();
            btn.icon.fillStyle(isActive ? GOLD : 0x907040, isActive ? 0.6 : 0.25);
            btn.icon.fillRect(btn.cx - 10, this.y + 8, 20, 16);
            btn.activeLine.setVisible(isActive);
        });
    }

    setActive(key) {
        this._active = key;
        this._updateActive();
    }

    destroy() {
        this.bg.destroy();
        this._buttons.forEach(btn => {
            btn.zone.destroy();
            btn.icon.destroy();
            btn.label.destroy();
            btn.activeLine.destroy();
        });
    }
}
