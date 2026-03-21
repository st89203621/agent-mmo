/**
 * MemoryScene.js  P04 记忆碎片
 * 展示玩家收集到的对话记忆碎片
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const PAPER= 0xf5ede0;
const HUD_H = 56;

// 示例数据
const DEMO_MEMORIES = [
    { id: 'm1', npc: '云裳仙子', world: '诛仙·天都', excerpt: '"你可知，这世间最难解的，不是仇，是情。"', fateValue: 68, unlocked: true },
    { id: 'm2', npc: '碧瑶',     world: '诛仙·幽冥', excerpt: '"若有来世，我只愿做一株草，长在你经过的路旁。"', fateValue: 95, unlocked: true },
    { id: 'm3', npc: '商贩老张', world: '诛仙·人间', excerpt: '"客官，这枚玉佩可有来历？"', fateValue: 22, unlocked: false },
    { id: 'm4', npc: '村长',     world: '诛仙·人间', excerpt: '"村子里的年轻人都走了，只剩我们这些老骨头。"', fateValue: 35, unlocked: true },
    { id: 'm5', npc: '隐世高人', world: '诛仙·荒古', excerpt: '"天道不仁，以万物为刍狗；圣人不仁，以百姓为刍狗。"', fateValue: 55, unlocked: false },
];

export default class MemoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MemoryScene' });
        this._memories   = [];
        this._selected   = null;
        this._cards      = [];
        this._scrollY    = 0;
        this._maskH      = 0;
    }

    preload() {}

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, INK);

        // 顶部
        this._buildHeader(W);

        // 卡片列表
        this._maskH = H - 70 - HUD_H;
        this._buildCards(W);

        // 请求服务端数据
        gameClient.send(CMD.MEMORY.cmd, CMD.MEMORY.getList, {});
        gameClient.on(`${CMD.MEMORY.cmd}_${CMD.MEMORY.getList}`, (d) => {
            if (d && d.memories) {
                this._memories = d.memories;
                this._buildCards(W);
            }
        });

        // 使用示例数据
        this._memories = DEMO_MEMORIES;
        this._buildCards(W);
    }

    _buildHeader(W) {
        const bg = this.add.graphics();
        bg.fillStyle(0x110e0b, 0.96);
        bg.fillRect(0, 0, W, 54);
        bg.lineStyle(1, GOLD, 0.25);
        bg.lineBetween(0, 54, W, 54);
        bg.setDepth(5);

        this.add.text(W / 2, 27, '记忆碎片', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '17px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(6);

        // 返回按钮
        const back = this.add.text(16, 27, '‹ 返回', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: 'rgba(201,168,76,0.7)',
        }).setOrigin(0, 0.5).setDepth(6).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.stop('MemoryScene'));
    }

    _buildCards(W) {
        // 清理旧卡片
        this._cards.forEach(c => {
            c.bg.destroy(); c.npcText.destroy(); c.worldText.destroy();
            c.excerptText.destroy();
            c.fateBar && c.fateBar.destroy();
            c.zone && c.zone.destroy();
        });
        this._cards = [];

        const cardH = 88;
        const gap   = 8;
        const startY = 62;

        this._memories.forEach((mem, i) => {
            const y = startY + i * (cardH + gap);
            const card = this._buildCard(8, y, W - 16, cardH, mem);
            this._cards.push(card);
        });
    }

    _buildCard(x, y, w, h, mem) {
        const bg = this.add.graphics();
        bg.fillStyle(mem.unlocked ? 0x1a1610 : 0x120f0d, 1);
        bg.fillRoundedRect(x, y, w, h, 6);
        bg.lineStyle(1, mem.unlocked ? GOLD : 0x3a3028, 0.5);
        bg.strokeRoundedRect(x, y, w, h, 6);
        bg.setDepth(2);

        // NPC 名
        const npcText = this.add.text(x + 12, y + 12, mem.npc, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '14px',
            color: mem.unlocked ? '#c9a84c' : '#5a5040',
        }).setDepth(3);

        // 世界标签
        const worldText = this.add.text(x + w - 10, y + 12, mem.world, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '10px',
            color: mem.unlocked ? 'rgba(201,168,76,0.6)' : '#3a3028',
        }).setOrigin(1, 0).setDepth(3);

        // 摘录
        const excerptColor = mem.unlocked ? 'rgba(245,237,224,0.8)' : 'rgba(90,80,64,0.7)';
        const excerptText = this.add.text(x + 12, y + 34, mem.unlocked ? mem.excerpt : '[ 未解锁 ]', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: excerptColor,
            wordWrap: { width: w - 24 },
            maxLines: 2,
        }).setDepth(3);

        // 缘分值条（迷你）
        let fateBar = null;
        if (mem.unlocked) {
            const barW = 80;
            const barX = x + w - barW - 12;
            const barY = y + h - 16;
            const gfx = this.add.graphics();
            gfx.fillStyle(0x2a2218, 1);
            gfx.fillRoundedRect(barX, barY, barW, 5, 2.5);
            gfx.fillStyle(GOLD, 1);
            gfx.fillRoundedRect(barX, barY, Math.max(4, barW * mem.fateValue / 100), 5, 2.5);
            gfx.setDepth(3);
            const fateLbl = this.add.text(barX - 4, barY + 2, `${mem.fateValue}`, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '10px',
                color: '#c9a84c',
            }).setOrigin(1, 0.5).setDepth(3);
            fateBar = { gfx, fateLbl, destroy() { this.gfx.destroy(); this.fateLbl.destroy(); } };
        }

        // 点击查看
        let zone = null;
        if (mem.unlocked) {
            zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
            zone.setDepth(4);
            zone.on('pointerdown', () => this._viewMemory(mem));
        }

        return { bg, npcText, worldText, excerptText, fateBar, zone };
    }

    _viewMemory(mem) {
        gameClient.send(CMD.MEMORY.cmd, CMD.MEMORY.view, { memoryId: mem.id });
        // 弹出详细面板
        const W = this.scale.width;
        const H = this.scale.height;

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.75);
        overlay.fillRect(0, 0, W, H);
        overlay.setDepth(20).setInteractive();

        const panelW = W - 40;
        const panelH = 280;
        const panelX = 20;
        const panelY = (H - panelH) / 2;

        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x1a1610, 1);
        panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
        panelBg.lineStyle(1, GOLD, 0.6);
        panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
        panelBg.setDepth(21);

        const titleT = this.add.text(panelX + panelW / 2, panelY + 22, `「${mem.npc}的记忆」`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '16px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(22);

        const worldT = this.add.text(panelX + 16, panelY + 54, mem.world, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: 'rgba(201,168,76,0.6)',
        }).setDepth(22);

        const excerptT = this.add.text(panelX + 16, panelY + 80, mem.excerpt, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '14px',
            color: '#f5ede0',
            wordWrap: { width: panelW - 32 },
            lineSpacing: 6,
        }).setDepth(22);

        const fateT = this.add.text(panelX + 16, panelY + 180, `缘分值：${mem.fateValue}`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: '#c9a84c',
        }).setDepth(22);

        // 关闭按钮
        const closeBtn = this.add.text(panelX + panelW - 16, panelY + 16, '✕', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '16px',
            color: 'rgba(201,168,76,0.7)',
        }).setOrigin(1, 0).setDepth(22).setInteractive({ useHandCursor: true });

        const panelObjs = [overlay, panelBg, titleT, worldT, excerptT, fateT, closeBtn];
        const doClose = () => panelObjs.forEach(o => o.destroy());
        closeBtn.on('pointerdown', doClose);
        overlay.on('pointerdown', doClose);
    }

    update() {}

    shutdown() {
        gameClient.offAll(`${CMD.MEMORY.cmd}_${CMD.MEMORY.getList}`);
    }
}
