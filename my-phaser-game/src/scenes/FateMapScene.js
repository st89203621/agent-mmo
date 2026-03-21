/**
 * FateMapScene.js  P17 因缘谱
 * 同心圆布局，NPC 节点按缘分值排布
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const PAPER= 0xf5ede0;
const HUD_H = 56;

const DEMO_FATES = [
    { id: 'npc_yunshang', name: '云裳',   fateValue: 95, world: '诛仙·天都', relation: '红线' },
    { id: 'npc_biyao',    name: '碧瑶',   fateValue: 88, world: '诛仙·幽冥', relation: '挚友' },
    { id: 'npc_elder',    name: '村长',   fateValue: 45, world: '诛仙·人间', relation: '长辈' },
    { id: 'npc_merchant', name: '老张',   fateValue: 22, world: '诛仙·人间', relation: '商贩' },
    { id: 'npc_fox',      name: '九尾',   fateValue: 66, world: '诛仙·冥界', relation: '因缘' },
    { id: 'npc_hermit',   name: '隐者',   fateValue: 38, world: '诛仙·荒古', relation: '师缘' },
    { id: 'npc_warrior',  name: '战神',   fateValue: 55, world: '凡人·修真', relation: '对手' },
    { id: 'npc_scholar',  name: '书生',   fateValue: 70, world: '凡人·凡界', relation: '知己' },
];

export default class FateMapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'FateMapScene' });
        this._fates = [];
        this._nodeObjs = [];
        this._detailPanel = null;
    }

    preload() {}

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.game.events.emit('setNavActive', 'fate');
        this.add.rectangle(W / 2, H / 2, W, H, INK);

        this._buildHeader(W);

        const mapCenterY = (H - HUD_H - 50) / 2 + 50;
        this._mapCenter = { x: W / 2, y: mapCenterY };

        this._buildRings(W, mapCenterY);
        this._fates = DEMO_FATES;
        this._buildNodes(W, mapCenterY);

        // 从 REST API 加载缘分数据
        gameClient.getRelations().then(d => {
            if (d && d.relations && d.relations.length > 0) {
                this._fates = d.relations.map(r => ({
                    id:        r.npcId,
                    name:      r.npcName,
                    fateValue: r.fateScore || 0,
                    world:     `第${r.worldIndex}世`,
                    relation:  r.milestone ? '红线' : (r.emotion || '因缘'),
                }));
                this._buildNodes(W, mapCenterY);
            }
        }).catch(() => { /* 使用 DEMO 数据 */ });
    }

    _buildHeader(W) {
        const bg = this.add.graphics();
        bg.fillStyle(0x110e0b, 0.96);
        bg.fillRect(0, 0, W, 50);
        bg.lineStyle(1, GOLD, 0.25);
        bg.lineBetween(0, 50, W, 50);
        bg.setDepth(5);

        this.add.text(W / 2, 25, '因缘谱', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '17px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(6);

        this.add.text(W - 14, 25, `缘系 ${this._fates.length || DEMO_FATES.length} 人`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: 'rgba(201,168,76,0.6)',
        }).setOrigin(1, 0.5).setDepth(6);
    }

    _buildRings(W, cy) {
        const cx = W / 2;
        const gfx = this.add.graphics();
        gfx.setDepth(1);

        // 三个同心圆（代表亲密/一般/疏远）
        const rings = [
            { r: 70,  alpha: 0.5, label: '亲密' },
            { r: 120, alpha: 0.35, label: '一般' },
            { r: 165, alpha: 0.2,  label: '疏远' },
        ];

        rings.forEach(ring => {
            // 虚线圆（用多段弧线模拟）
            gfx.lineStyle(1, GOLD, ring.alpha);
            gfx.strokeCircle(cx, cy, ring.r);

            // 圆环标签
            this.add.text(cx + ring.r + 4, cy, ring.label, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '9px',
                color: `rgba(201,168,76,${ring.alpha})`,
            }).setOrigin(0, 0.5).setDepth(2);
        });

        // 中心"你"
        gfx.fillStyle(GOLD, 1);
        gfx.fillCircle(cx, cy, 20);
        gfx.lineStyle(2, 0xffe88a, 0.8);
        gfx.strokeCircle(cx, cy, 20);

        this.add.text(cx, cy, '你', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '14px',
            color: '#0e0b09',
        }).setOrigin(0.5).setDepth(3);
    }

    _buildNodes(W, cy) {
        // 清理旧节点
        this._nodeObjs.forEach(n => {
            n.line.destroy();
            n.circle.destroy();
            n.label.destroy();
            n.fateText.destroy();
            n.zone.destroy();
        });
        this._nodeObjs = [];

        const cx = W / 2;
        const fates = this._fates;
        const count = fates.length;

        fates.forEach((fate, i) => {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;

            // 根据缘分值决定距离圆心的半径
            let radius;
            if (fate.fateValue >= 80)      radius = 70;
            else if (fate.fateValue >= 50)  radius = 120;
            else                            radius = 165;

            const nx = cx + Math.cos(angle) * radius;
            const ny = cy + Math.sin(angle) * radius;

            // 连线（粗细由缘分值决定）
            const lineWidth = Math.max(1, fate.fateValue / 40);
            const lineAlpha = 0.2 + fate.fateValue / 200;
            const lineColor = fate.relation === '红线' ? 0xd44040 : GOLD;

            const line = this.add.graphics();
            line.lineStyle(lineWidth, lineColor, lineAlpha);
            line.lineBetween(cx, cy, nx, ny);
            line.setDepth(2);

            // NPC 节点圆
            const nodeR = 18 + fate.fateValue / 20;
            const circle = this.add.graphics();
            circle.fillStyle(fate.relation === '红线' ? 0x3a1010 : 0x1a1a10, 1);
            circle.fillCircle(nx, ny, nodeR);
            circle.lineStyle(1.5, fate.relation === '红线' ? 0xd44040 : GOLD, 0.7);
            circle.strokeCircle(nx, ny, nodeR);
            circle.setDepth(3);

            // NPC 名字
            const label = this.add.text(nx, ny + nodeR + 8, fate.name, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '10px',
                color: fate.relation === '红线' ? '#d44040' : '#c9a84c',
            }).setOrigin(0.5, 0).setDepth(4);

            // 缘分值文字
            const fateText = this.add.text(nx, ny, `${fate.fateValue}`, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '10px',
                color: '#f5ede0',
            }).setOrigin(0.5).setDepth(5);

            const zone = this.add.zone(nx, ny, nodeR * 2 + 10, nodeR * 2 + 10)
                .setInteractive({ useHandCursor: true }).setDepth(6);
            zone.on('pointerdown', () => this._showNpcDetail(fate, nx, ny));
            zone.on('pointerover', () => {
                circle.clear();
                circle.fillStyle(fate.relation === '红线' ? 0x5a1818 : 0x2a2a18, 1);
                circle.fillCircle(nx, ny, nodeR + 2);
                circle.lineStyle(2, fate.relation === '红线' ? 0xff5555 : 0xffe88a, 1);
                circle.strokeCircle(nx, ny, nodeR + 2);
            });
            zone.on('pointerout', () => {
                circle.clear();
                circle.fillStyle(fate.relation === '红线' ? 0x3a1010 : 0x1a1a10, 1);
                circle.fillCircle(nx, ny, nodeR);
                circle.lineStyle(1.5, fate.relation === '红线' ? 0xd44040 : GOLD, 0.7);
                circle.strokeCircle(nx, ny, nodeR);
            });

            this._nodeObjs.push({ fate, line, circle, label, fateText, zone, nx, ny });
        });
    }

    _showNpcDetail(fate, nx, ny) {
        const W = this.scale.width;
        const H = this.scale.height;

        // 先清除旧面板
        if (this._detailPanel) {
            this._detailPanel.forEach(o => o.destroy && o.destroy());
            this._detailPanel = null;
        }

        const panelW = 220;
        const panelH = 160;

        // 定位（避免超出屏幕）
        let panelX = nx - panelW / 2;
        let panelY = ny - panelH - 10;
        if (panelX < 8)       panelX = 8;
        if (panelX + panelW > W - 8) panelX = W - panelW - 8;
        if (panelY < 54)      panelY = ny + 20;

        const bg = this.add.graphics();
        bg.fillStyle(0x1a1610, 0.97);
        bg.fillRoundedRect(panelX, panelY, panelW, panelH, 6);
        bg.lineStyle(1, GOLD, 0.6);
        bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 6);
        bg.setDepth(20);

        const nameT = this.add.text(panelX + 14, panelY + 14, fate.name, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#c9a84c',
        }).setDepth(21);

        const relT = this.add.text(panelX + panelW - 12, panelY + 16, fate.relation, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px',
            color: fate.relation === '红线' ? '#d44040' : 'rgba(201,168,76,0.7)',
        }).setOrigin(1, 0).setDepth(21);

        const worldT = this.add.text(panelX + 14, panelY + 40, fate.world, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '11px', color: 'rgba(245,237,224,0.6)',
        }).setDepth(21);

        const fateT = this.add.text(panelX + 14, panelY + 64, `缘分值：${fate.fateValue}`, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#c9a84c',
        }).setDepth(21);

        // 缘分进度条
        const barX = panelX + 14;
        const barY = panelY + 88;
        const barW = panelW - 28;
        const barGfx = this.add.graphics();
        barGfx.fillStyle(0x2a2218, 1);
        barGfx.fillRoundedRect(barX, barY, barW, 8, 4);
        barGfx.fillStyle(GOLD, 1);
        barGfx.fillRoundedRect(barX, barY, Math.max(4, barW * fate.fateValue / 100), 8, 4);
        barGfx.setDepth(21);

        // 对话按钮
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x2a2010, 1);
        btnBg.fillRoundedRect(panelX + 14, panelY + 110, panelW - 28, 32, 4);
        btnBg.lineStyle(1, GOLD, 0.5);
        btnBg.strokeRoundedRect(panelX + 14, panelY + 110, panelW - 28, 32, 4);
        btnBg.setDepth(21);

        const btnT = this.add.text(panelX + panelW / 2, panelY + 126, '与其对话 ›', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#c9a84c',
        }).setOrigin(0.5).setDepth(22);

        const closeT = this.add.text(panelX + panelW - 10, panelY + 10, '✕', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: 'rgba(201,168,76,0.6)',
        }).setOrigin(1, 0).setDepth(22).setInteractive({ useHandCursor: true });

        const btnZone = this.add.zone(panelX + panelW / 2, panelY + 126, panelW - 28, 32)
            .setInteractive({ useHandCursor: true }).setDepth(23);

        const objs = [bg, nameT, relT, worldT, fateT, barGfx, btnBg, btnT, closeT, btnZone];
        this._detailPanel = objs;

        btnZone.on('pointerdown', () => {
            objs.forEach(o => o.destroy && o.destroy());
            this._detailPanel = null;
            this.scene.start('StoryScene', {
                npcId:      fate.id,
                worldIndex: 1,
                npcName:    fate.name,
                bookTag:    fate.world,
                fateValue:  fate.fateValue,
            });
        });

        closeT.on('pointerdown', () => {
            objs.forEach(o => o.destroy && o.destroy());
            this._detailPanel = null;
        });
    }

    update() {}

    shutdown() {
        if (this._detailPanel) {
            this._detailPanel.forEach(o => o.destroy && o.destroy());
            this._detailPanel = null;
        }
    }
}
