/**
 * EnchantScene.js  P08 装备附魔
 * 选择装备 → 选择附魔效果 → 确认
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const HUD_H = 56;

const DEMO_EQUIPS = [
    { id: 'eq1', name: '幽冥斩魄剑', slot: 'weapon', level: 45, enchant: '锋锐·三阶' },
    { id: 'eq2', name: '太清仙甲',   slot: 'body',   level: 42, enchant: null },
    { id: 'eq3', name: '云纹护腕',   slot: 'hand',   level: 38, enchant: '疾风·一阶' },
];

const ENCHANT_OPTIONS = [
    { id: 'e1', name: '锋锐',  tier: '一阶', effect: '攻击+50',  cost: 100 },
    { id: 'e2', name: '锋锐',  tier: '二阶', effect: '攻击+120', cost: 300 },
    { id: 'e3', name: '疾风',  tier: '一阶', effect: '速度+30',  cost: 80  },
    { id: 'e4', name: '坚韧',  tier: '一阶', effect: '防御+60',  cost: 120 },
    { id: 'e5', name: '精神',  tier: '一阶', effect: '法力+80',  cost: 90  },
    { id: 'e6', name: '灵动',  tier: '二阶', effect: '暴击+5%',  cost: 250 },
];

export default class EnchantScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EnchantScene' });
        this._selectedEquip   = null;
        this._selectedEnchant = null;
        this._equipListObjs   = [];  // 装备列表所有游戏对象
        this._enchantPanelObjs = []; // 附魔面板所有游戏对象
    }

    preload() {}

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, INK);
        this._buildHeader(W);
        this._buildEquipList(W);
        this._buildEnchantPanel(W, H);
        this._buildConfirmBtn(W, H);

        gameClient.send(CMD.ENCHANT.cmd, CMD.ENCHANT.getList, {});
        gameClient.on(`${CMD.ENCHANT.cmd}_${CMD.ENCHANT.getList}`, (d) => {
            if (d && d.equips) this._refreshEquips(d.equips);
        });
    }

    _buildHeader(W) {
        const bg = this.add.graphics();
        bg.fillStyle(0x110e0b, 0.96);
        bg.fillRect(0, 0, W, 50);
        bg.lineStyle(1, GOLD, 0.25);
        bg.lineBetween(0, 50, W, 50);
        bg.setDepth(5);

        this.add.text(W / 2, 25, '装备附魔', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '17px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(6);

        const back = this.add.text(16, 25, '‹ 返回', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: 'rgba(201,168,76,0.7)',
        }).setOrigin(0, 0.5).setDepth(6).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.stop('EnchantScene'));
    }

    _buildEquipList(W) {
        // 清理旧对象
        this._equipListObjs.forEach(o => o.destroy && o.destroy());
        this._equipListObjs = [];

        const lbl = this.add.text(14, 58, '选择装备', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: 'rgba(201,168,76,0.6)',
        }).setDepth(4);
        this._equipListObjs.push(lbl);

        const itemH = 52;
        DEMO_EQUIPS.forEach((eq, i) => {
            const y = 76 + i * (itemH + 6);
            const objs = this._buildEquipItem(8, y, W - 16, itemH, eq);
            this._equipListObjs.push(...objs);
        });
    }

    _buildEquipItem(x, y, w, h, eq) {
        const isSelected = this._selectedEquip && this._selectedEquip.id === eq.id;

        const bg = this.add.graphics();
        bg.fillStyle(isSelected ? 0x2a2010 : 0x1a1610, 1);
        bg.fillRoundedRect(x, y, w, h, 5);
        bg.lineStyle(1, GOLD, isSelected ? 0.8 : 0.3);
        bg.strokeRoundedRect(x, y, w, h, 5);
        bg.setDepth(3);

        const nameT = this.add.text(x + 12, y + 12, eq.name, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '14px',
            color: '#f5ede0',
        }).setDepth(4);

        const subT = this.add.text(x + 12, y + 32, `Lv.${eq.level}  ${eq.slot}`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: 'rgba(245,237,224,0.5)',
        }).setDepth(4);

        const enchantLabel = eq.enchant || '无附魔';
        const enchantT = this.add.text(x + w - 12, y + 12, enchantLabel, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: eq.enchant ? '#c9a84c' : 'rgba(245,237,224,0.3)',
        }).setOrigin(1, 0).setDepth(4);

        const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true }).setDepth(5);
        zone.on('pointerdown', () => {
            this._selectedEquip = eq;
            this._buildEquipList(this.scale.width);
        });

        return [bg, nameT, subT, enchantT, zone];
    }

    _buildEnchantPanel(W, H) {
        // 清理旧对象
        this._enchantPanelObjs.forEach(o => o.destroy && o.destroy());
        this._enchantPanelObjs = [];

        const panelY = 250;
        const lbl = this.add.text(14, panelY, '选择附魔效果', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: 'rgba(201,168,76,0.6)',
        }).setDepth(4);
        this._enchantPanelObjs.push(lbl);

        const itemW = (W - 28) / 2;
        const itemH = 52;

        ENCHANT_OPTIONS.forEach((opt, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = 8 + col * (itemW + 6);
            const y = panelY + 22 + row * (itemH + 6);

            const objs = this._buildEnchantOption(x, y, itemW, itemH, opt);
            this._enchantPanelObjs.push(...objs);
        });
    }

    _buildEnchantOption(x, y, w, h, opt) {
        const isSelected = this._selectedEnchant && this._selectedEnchant.id === opt.id;

        const bg = this.add.graphics();
        bg.fillStyle(isSelected ? 0x1a2010 : 0x141210, 1);
        bg.fillRoundedRect(x, y, w, h, 5);
        bg.lineStyle(1, isSelected ? 0x6aaa4a : 0x3a3020, isSelected ? 0.8 : 0.4);
        bg.strokeRoundedRect(x, y, w, h, 5);
        bg.setDepth(3);

        const nameT = this.add.text(x + 10, y + 8, `${opt.name}·${opt.tier}`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: '#c9a84c',
        }).setDepth(4);

        const effectT = this.add.text(x + 10, y + 28, opt.effect, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: '#80cc60',
        }).setDepth(4);

        const costT = this.add.text(x + w - 8, y + 28, `${opt.cost}灵石`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: 'rgba(201,168,76,0.6)',
        }).setOrigin(1, 0).setDepth(4);

        const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true }).setDepth(5);
        zone.on('pointerdown', () => {
            this._selectedEnchant = opt;
            this._buildEnchantPanel(this.scale.width, this.scale.height);
        });

        return [bg, nameT, effectT, costT, zone];
    }

    _buildConfirmBtn(W, H) {
        const btnY = H - HUD_H - 52;
        const btnW = W - 24;

        const bg = this.add.graphics();
        bg.fillStyle(0x2a2010, 1);
        bg.fillRoundedRect(12, btnY, btnW, 42, 5);
        bg.lineStyle(1, GOLD, 0.6);
        bg.strokeRoundedRect(12, btnY, btnW, 42, 5);  // 修复：原来第2参数写成了 btnW
        bg.setDepth(5);

        const label = this.add.text(W / 2, btnY + 21, '确认附魔', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '15px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(6);

        const zone = this.add.zone(W / 2, btnY + 21, btnW, 42)
            .setInteractive({ useHandCursor: true }).setDepth(7);

        zone.on('pointerdown', () => {
            if (!this._selectedEquip || !this._selectedEnchant) {
                label.setText('请先选择装备和附魔效果');
                this.time.delayedCall(1500, () => label.setText('确认附魔'));
                return;
            }
            gameClient.send(CMD.ENCHANT.cmd, CMD.ENCHANT.enchant, {
                equipId:   this._selectedEquip.id,
                enchantId: this._selectedEnchant.id,
            });
            label.setText('附魔中...');
            gameClient.once(`${CMD.ENCHANT.cmd}_${CMD.ENCHANT.enchant}`, (d) => {
                label.setText(d && d.success ? '附魔成功！' : '附魔失败');
                this.time.delayedCall(1500, () => label.setText('确认附魔'));
            });
        });
    }

    _refreshEquips(equips) {
        // 用服务器数据刷新（此处简化）
    }

    update() {}

    shutdown() {
        this._equipListObjs.forEach(o => o.destroy && o.destroy());
        this._equipListObjs = [];
        this._enchantPanelObjs.forEach(o => o.destroy && o.destroy());
        this._enchantPanelObjs = [];
        gameClient.offAll(`${CMD.ENCHANT.cmd}_${CMD.ENCHANT.getList}`);
    }
}
