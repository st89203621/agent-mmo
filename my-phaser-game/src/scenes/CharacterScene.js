/**
 * CharacterScene.js  P06 人物装备
 * 七世标签 + 角色立绘 + 5个装备槽
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const PAPER= 0xf5ede0;
const HUD_H = 56;

const WORLD_TABS = [
    { index: 1, label: '一世·诛仙' },
    { index: 2, label: '二世·凡人' },
    { index: 3, label: '三世·斗破' },
    { index: 4, label: '四世·完美' },
    { index: 5, label: '五世·遮天' },
    { index: 6, label: '六世·雪鹰' },
    { index: 7, label: '七世·归处' },
];

const EQUIP_SLOTS = [
    { key: 'weapon', label: '武器', x: 30,  y: 160 },
    { key: 'body',   label: '身体', x: 150, y: 160 },
    { key: 'hand',   label: '手部', x: 270, y: 160 },
    { key: 'leg',    label: '腿部', x: 90,  y: 280 },
    { key: 'acc',    label: '饰品', x: 210, y: 280 },
];

export default class CharacterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterScene' });
        this._currentWorld = 1;
        this._charData     = {};
        this._tabObjs      = [];
        this._slotObjs     = [];
    }

    preload() {}

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.game.events.emit('setNavActive', 'character');
        this.add.rectangle(W / 2, H / 2, W, H, INK);

        // 顶部标题
        this._buildHeader(W);

        // 七世标签横向滚动
        this._buildWorldTabs(W);

        // 角色立绘区
        this._buildPortrait(W);

        // 装备槽
        this._buildEquipSlots(W);

        // 属性统计
        this._buildStats(W, H);

        // 请求数据
        gameClient.send(CMD.CHARACTER.cmd, CMD.CHARACTER.getInfo, { worldIndex: this._currentWorld });
        gameClient.on(`${CMD.CHARACTER.cmd}_${CMD.CHARACTER.getInfo}`, (d) => {
            if (d) this._onCharData(d);
        });
    }

    _buildHeader(W) {
        const bg = this.add.graphics();
        bg.fillStyle(0x110e0b, 0.96);
        bg.fillRect(0, 0, W, 50);
        bg.lineStyle(1, GOLD, 0.25);
        bg.lineBetween(0, 50, W, 50);
        bg.setDepth(5);

        this.add.text(W / 2, 25, '人物装备', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '17px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(6);
    }

    _buildWorldTabs(W) {
        this._tabObjs.forEach(t => { t.bg.destroy(); t.label.destroy(); t.zone.destroy(); });
        this._tabObjs = [];

        const tabH = 30;
        const tabY = 56;
        let offsetX = 8;

        WORLD_TABS.forEach(tab => {
            const tabW = tab.label.length * 11 + 16;
            const isActive = tab.index === this._currentWorld;

            const bg = this.add.graphics();
            bg.fillStyle(isActive ? 0x2a2010 : 0x1a1610, 1);
            bg.fillRoundedRect(offsetX, tabY, tabW, tabH, 4);
            bg.lineStyle(1, isActive ? GOLD : 0x3a3020, isActive ? 0.8 : 0.4);
            bg.strokeRoundedRect(offsetX, tabY, tabW, tabH, 4);
            bg.setDepth(4);

            const label = this.add.text(offsetX + tabW / 2, tabY + tabH / 2, tab.label, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '11px',
                color: isActive ? '#c9a84c' : 'rgba(245,237,224,0.4)',
            }).setOrigin(0.5).setDepth(5);

            const zone = this.add.zone(offsetX + tabW / 2, tabY + tabH / 2, tabW, tabH)
                .setInteractive({ useHandCursor: true }).setDepth(6);
            zone.on('pointerdown', () => {
                this._currentWorld = tab.index;
                this._buildWorldTabs(W);
                gameClient.send(CMD.CHARACTER.cmd, CMD.CHARACTER.getInfo, { worldIndex: tab.index });
            });

            this._tabObjs.push({ bg, label, zone });
            offsetX += tabW + 4;
        });
    }

    _buildPortrait(W) {
        const portX = W / 2 - 55;
        const portY = 96;
        const portW = 110;
        const portH = 150;

        const gfx = this.add.graphics();
        gfx.fillStyle(0x1a1610, 1);
        gfx.fillRoundedRect(portX, portY, portW, portH, 6);
        gfx.lineStyle(1, GOLD, 0.3);
        gfx.strokeRoundedRect(portX, portY, portW, portH, 6);

        // 人物形状
        gfx.fillStyle(GOLD, 0.1);
        gfx.fillCircle(W / 2, portY + 38, 25); // 头
        gfx.fillRect(W / 2 - 20, portY + 66, 40, 70); // 身体

        this.add.text(W / 2, portY + portH + 8, '点击装备槽换装', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: 'rgba(201,168,76,0.5)',
        }).setOrigin(0.5).setDepth(3);
    }

    _buildEquipSlots(W) {
        this._slotObjs.forEach(s => { s.bg.destroy(); s.label.destroy(); s.zone.destroy(); });
        this._slotObjs = [];

        const slotW = 70;
        const slotH = 70;
        const offsetY = 90;

        EQUIP_SLOTS.forEach(slot => {
            const sx = slot.x;
            const sy = slot.y + offsetY;

            const bg = this.add.graphics();
            bg.fillStyle(0x1a1610, 1);
            bg.fillRoundedRect(sx, sy, slotW, slotH, 5);
            bg.lineStyle(1, GOLD, 0.35);
            bg.strokeRoundedRect(sx, sy, slotW, slotH, 5);
            bg.setDepth(3);

            // 插槽图标（简单图形）
            bg.fillStyle(GOLD, 0.08);
            bg.fillRoundedRect(sx + 8, sy + 10, slotW - 16, slotW - 22, 3);

            const label = this.add.text(sx + slotW / 2, sy + slotH - 12, slot.label, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '11px',
                color: 'rgba(201,168,76,0.7)',
            }).setOrigin(0.5).setDepth(4);

            const zone = this.add.zone(sx + slotW / 2, sy + slotH / 2, slotW, slotH)
                .setInteractive({ useHandCursor: true }).setDepth(5);
            zone.on('pointerdown', () => this._onSlotClick(slot.key));
            zone.on('pointerover', () => {
                bg.clear();
                bg.fillStyle(0x2a2218, 1);
                bg.fillRoundedRect(sx, sy, slotW, slotH, 5);
                bg.lineStyle(1, GOLD, 0.65);
                bg.strokeRoundedRect(sx, sy, slotW, slotH, 5);
            });
            zone.on('pointerout', () => {
                bg.clear();
                bg.fillStyle(0x1a1610, 1);
                bg.fillRoundedRect(sx, sy, slotW, slotH, 5);
                bg.lineStyle(1, GOLD, 0.35);
                bg.strokeRoundedRect(sx, sy, slotW, slotH, 5);
            });

            this._slotObjs.push({ bg, label, zone, key: slot.key });
        });
    }

    _buildStats(W, H) {
        const statsY = H - HUD_H - 130;
        const bg = this.add.graphics();
        bg.fillStyle(0x110e0b, 0.9);
        bg.fillRect(0, statsY, W, 130);
        bg.lineStyle(1, GOLD, 0.2);
        bg.lineBetween(0, statsY, W, statsY);
        bg.setDepth(3);

        this.add.text(14, statsY + 10, '属性总览', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: '#c9a84c',
        }).setDepth(4);

        const stats = [
            ['攻击', '1000', '防御', '800'],
            ['血量', '5000', '法力', '3000'],
            ['速度', '320',  '暴击', '15%'],
        ];

        stats.forEach((row, i) => {
            const y = statsY + 34 + i * 28;
            this.add.text(14,     y, `${row[0]}：${row[1]}`, {
                fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: '#f5ede0' }).setDepth(4);
            this.add.text(W / 2, y, `${row[2]}：${row[3]}`, {
                fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: '#f5ede0' }).setDepth(4);
        });

        // 附魔/技能快捷入口
        const enchantBtn = this.add.text(14, statsY + 105, '附魔 ›', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: '#c9a84c',
            backgroundColor: 'rgba(201,168,76,0.1)', padding: { x: 8, y: 4 },
        }).setDepth(4).setInteractive({ useHandCursor: true });
        enchantBtn.on('pointerdown', () => this.scene.start('EnchantScene'));

        const skillBtn = this.add.text(80, statsY + 105, '技能树 ›', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: '#c9a84c',
            backgroundColor: 'rgba(201,168,76,0.1)', padding: { x: 8, y: 4 },
        }).setDepth(4).setInteractive({ useHandCursor: true });
        skillBtn.on('pointerdown', () => this.scene.start('SkillScene'));
    }

    _onSlotClick(slotKey) {
        // 打开背包，过滤对应类型装备
        this.scene.start('BagScene', { filterSlot: slotKey });
    }

    _onCharData(data) {
        // 更新装备槽显示
        if (data.equips) {
            Object.entries(data.equips).forEach(([slot, item]) => {
                const slotObj = this._slotObjs.find(s => s.key === slot);
                if (slotObj && item) {
                    slotObj.label.setText(item.name || slot);
                    slotObj.label.setColor('#c9a84c');
                }
            });
        }
    }

    update() {}

    shutdown() {
        gameClient.offAll(`${CMD.CHARACTER.cmd}_${CMD.CHARACTER.getInfo}`);
    }
}
