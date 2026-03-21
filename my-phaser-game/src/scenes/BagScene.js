/**
 * BagScene.js  P10 背包
 * 5类 Tab + 8×6 格子网格 + 物品详情弹窗
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const HUD_H = 56;

const TABS = [
    { key: 'material', label: '材料'  },
    { key: 'tool',     label: '道具'  },
    { key: 'consume',  label: '消耗品'},
    { key: 'shard',    label: '套装碎片'},
    { key: 'special',  label: '特殊'  },
];

const GRID_COLS = 6;
const GRID_ROWS = 8;
const CELL_SIZE = 52;
const GRID_PAD  = 6;

// 示例物品
const DEMO_ITEMS = {
    material: [
        { id: 'it1', name: '灵石',   qty: 999,  desc: '修炼必备资源，可换取灵气。',    rarity: 'common'   },
        { id: 'it2', name: '玄铁',   qty: 12,   desc: '锻造高级武器的核心材料。',       rarity: 'rare'     },
        { id: 'it3', name: '天蚕丝', qty: 3,    desc: '传说中的天蚕所吐之丝，极珍稀。', rarity: 'legendary'},
        { id: 'it4', name: '骨灵草', qty: 55,   desc: '炼制伤药的基础草药。',           rarity: 'common'   },
        { id: 'it5', name: '寒玉',   qty: 8,    desc: '蕴含寒冰之力的天然玉石。',       rarity: 'uncommon' },
    ],
    tool:    [
        { id: 'it6', name: '传送符', qty: 5,   desc: '使用后可立即传送到最近城镇。', rarity: 'uncommon' },
        { id: 'it7', name: '探查镜', qty: 2,   desc: '探查周边地区隐藏 POI。',       rarity: 'rare'     },
    ],
    consume: [
        { id: 'it8', name: '小回气丹', qty: 20, desc: '恢复 500 点气血。',   rarity: 'common'   },
        { id: 'it9', name: '中回气丹', qty: 8,  desc: '恢复 2000 点气血。',  rarity: 'uncommon' },
        { id: 'it10',name: '灵气散',   qty: 3,  desc: '恢复 1000 点法力。',  rarity: 'uncommon' },
    ],
    shard:   [
        { id: 'it11', name: '太清甲碎片', qty: 2, desc: '收集6片可合成太清仙甲套装。', rarity: 'rare' },
    ],
    special: [
        { id: 'it12', name: '命运之轮',  qty: 1, desc: '蕴含着轮回之力的神秘道具。',   rarity: 'legendary' },
    ],
};

const RARITY_COLORS = {
    common:    '#9a9a9a',
    uncommon:  '#5ab0e0',
    rare:      '#c9a84c',
    legendary: '#e07040',
};

export default class BagScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BagScene' });
        this._activeTab  = 'material';
        this._items      = DEMO_ITEMS;
        this._cellObjs   = [];
        this._tabObjs    = [];
    }

    preload() {}

    create(data) {
        if (data && data.filterSlot) {
            // 如果从装备槽过来，先显示材料
            this._activeTab = 'material';
        }

        const W = this.scale.width;
        const H = this.scale.height;

        this.game.events.emit('setNavActive', 'bag');
        this.add.rectangle(W / 2, H / 2, W, H, INK);

        this._buildHeader(W);
        this._buildTabs(W);
        this._buildGrid(W, H);

        // 货币显示
        this._buildCurrencyBar(W, H);

        // 请求服务端背包数据
        gameClient.send(CMD.BAG.cmd, CMD.BAG.getItems, {});
        gameClient.on(`${CMD.BAG.cmd}_${CMD.BAG.getItems}`, (d) => {
            if (d && d.items) {
                this._items = d.items;
                this._buildGrid(W, H);
            }
        });
    }

    _buildHeader(W) {
        const bg = this.add.graphics();
        bg.fillStyle(0x110e0b, 0.96);
        bg.fillRect(0, 0, W, 50);
        bg.lineStyle(1, GOLD, 0.25);
        bg.lineBetween(0, 50, W, 50);
        bg.setDepth(5);

        this.add.text(W / 2, 25, '背包', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '17px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(6);
    }

    _buildTabs(W) {
        this._tabObjs.forEach(t => { t.bg.destroy(); t.text.destroy(); t.zone.destroy(); });
        this._tabObjs = [];

        const tabW = W / TABS.length;
        const tabH = 34;
        const tabY = 52;

        TABS.forEach((tab, i) => {
            const isActive = tab.key === this._activeTab;
            const x = i * tabW;

            const bg = this.add.graphics();
            bg.fillStyle(isActive ? 0x2a2010 : 0x151210, 1);
            bg.fillRect(x, tabY, tabW, tabH);
            if (isActive) {
                bg.lineStyle(2, GOLD, 0.6);
                bg.lineBetween(x, tabY + tabH - 1, x + tabW, tabY + tabH - 1);
            }
            bg.setDepth(4);

            const text = this.add.text(x + tabW / 2, tabY + tabH / 2, tab.label, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '11px',
                color: isActive ? '#c9a84c' : 'rgba(245,237,224,0.45)',
            }).setOrigin(0.5).setDepth(5);

            const zone = this.add.zone(x + tabW / 2, tabY + tabH / 2, tabW, tabH)
                .setInteractive({ useHandCursor: true }).setDepth(6);
            zone.on('pointerdown', () => {
                this._activeTab = tab.key;
                this._buildTabs(W);
                this._buildGrid(this.scale.width, this.scale.height);
            });

            this._tabObjs.push({ bg, text, zone });
        });
    }

    _buildGrid(W, H) {
        this._cellObjs.forEach(c => {
            c.bg.destroy();
            if (c.icon)     c.icon.destroy();
            if (c.nameText) c.nameText.destroy();
            if (c.qtyText)  c.qtyText.destroy();
            if (c.zone)     c.zone.destroy();
        });
        this._cellObjs = [];

        const gridStartX = (W - GRID_COLS * (CELL_SIZE + GRID_PAD) + GRID_PAD) / 2;
        const gridStartY = 92;
        const items = this._items[this._activeTab] || [];

        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const index = row * GRID_COLS + col;
                const item  = items[index] || null;
                const cx    = gridStartX + col * (CELL_SIZE + GRID_PAD);
                const cy    = gridStartY + row * (CELL_SIZE + GRID_PAD);

                const cell = this._buildCell(cx, cy, CELL_SIZE, item);
                this._cellObjs.push(cell);
            }
        }
    }

    _buildCell(x, y, size, item) {
        const bg = this.add.graphics();
        bg.fillStyle(item ? 0x1e1a12 : 0x161210, 1);
        bg.fillRoundedRect(x, y, size, size, 4);
        bg.lineStyle(1, item ? GOLD : 0x2a2218, item ? 0.35 : 0.25);
        bg.strokeRoundedRect(x, y, size, size, 4);
        bg.setDepth(3);

        let icon = null;
        let qtyText = null;
        let zone = null;

        if (item) {
            // 图标（彩色方块代替图片）
            const rarityColor = RARITY_COLORS[item.rarity] || '#9a9a9a';
            icon = this.add.graphics();
            icon.fillStyle(Phaser.Display.Color.HexStringToColor(rarityColor).color, 0.3);
            icon.fillRoundedRect(x + 6, y + 6, size - 12, size - 20, 3);
            icon.lineStyle(1, Phaser.Display.Color.HexStringToColor(rarityColor).color, 0.7);
            icon.strokeRoundedRect(x + 6, y + 6, size - 12, size - 20, 3);
            icon.setDepth(4);

            // 名字（缩写）
            const shortName = item.name.slice(0, 2);
            const nameText = this.add.text(x + size / 2, y + size / 2 - 3, shortName, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '12px',
                color: rarityColor,
            }).setOrigin(0.5).setDepth(5);

            // 数量
            qtyText = this.add.text(x + size - 4, y + size - 4, `${item.qty}`, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '10px',
                color: '#f5ede0',
            }).setOrigin(1).setDepth(5);

            zone = this.add.zone(x + size / 2, y + size / 2, size, size)
                .setInteractive({ useHandCursor: true }).setDepth(6);
            zone.on('pointerdown', () => this._showItemDetail(item, x, y));
            zone.on('pointerover', () => {
                bg.clear();
                bg.fillStyle(0x2a2218, 1);
                bg.fillRoundedRect(x, y, size, size, 4);
                bg.lineStyle(1, GOLD, 0.7);
                bg.strokeRoundedRect(x, y, size, size, 4);
            });
            zone.on('pointerout', () => {
                bg.clear();
                bg.fillStyle(0x1e1a12, 1);
                bg.fillRoundedRect(x, y, size, size, 4);
                bg.lineStyle(1, GOLD, 0.35);
                bg.strokeRoundedRect(x, y, size, size, 4);
            });
        }

        return { bg, icon, nameText, qtyText, zone };
    }

    _showItemDetail(item, cellX, cellY) {
        const tooltip = document.getElementById('item-tooltip');
        const nameEl  = document.getElementById('tooltip-name');
        const descEl  = document.getElementById('tooltip-desc');

        if (!tooltip || !nameEl || !descEl) return;

        const rarityColor = RARITY_COLORS[item.rarity] || '#9a9a9a';
        nameEl.textContent = item.name;
        nameEl.style.color = rarityColor;
        descEl.textContent = item.desc + `\n数量：${item.qty}`;

        // 定位：在格子右侧显示
        const container = document.getElementById('game-container');
        const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
        const W = this.scale.width;
        const tipLeft = Math.min(cellX + 58, W - 210);
        tooltip.style.left = `${tipLeft}px`;
        tooltip.style.top  = `${Math.max(10, cellY - 30)}px`;
        tooltip.style.display = 'block';
    }

    _buildCurrencyBar(W, H) {
        const barY = H - HUD_H - 36;
        const bg = this.add.graphics();
        bg.fillStyle(0x110e0b, 0.9);
        bg.fillRect(0, barY, W, 36);
        bg.lineStyle(1, GOLD, 0.2);
        bg.lineBetween(0, barY, W, barY);
        bg.setDepth(5);

        this.add.text(14, barY + 10, '灵石：999', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: '#c9a84c',
        }).setDepth(6);

        this.add.text(W / 2, barY + 10, '仙晶：88', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: '#80cc60',
        }).setDepth(6);
    }

    update() {}

    shutdown() {
        gameClient.offAll(`${CMD.BAG.cmd}_${CMD.BAG.getItems}`);
        const tooltip = document.getElementById('item-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }
}
