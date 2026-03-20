/**
 * ExploreScene.js  P03 探索页
 * 地图探索，POI 点击进入 NPC 对话
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const PAPER= 0xf5ede0;
const GREEN= 0x3a6b35;

const HUD_H = 56;

// 示例 POI 数据（正式游戏从服务端获取）
const DEMO_POIS = [
    { id: 'poi_taoist_hall', name: '太清殿', desc: '玄门圣地，气运汇聚之所。', x: 90,  y: 180, npcId: 'npc_qingyun', npcName: '清云长老', bookTag: '诛仙·天都' },
    { id: 'poi_market',      name: '琉璃市',  desc: '三界商贾云集，奇货可居。', x: 220, y: 260, npcId: 'npc_merchant', npcName: '商贩老张', bookTag: '诛仙·人间' },
    { id: 'poi_forest',      name: '幽冥森林', desc: '阴气森森，妖兽出没。',    x: 150, y: 350, npcId: 'npc_fox',      npcName: '狐妖九尾', bookTag: '诛仙·冥界' },
    { id: 'poi_village',     name: '草村',    desc: '平凡村落，有人间烟火。',  x: 320, y: 200, npcId: 'npc_elder',    npcName: '村长',     bookTag: '诛仙·人间' },
    { id: 'poi_cave',        name: '幽深洞府', desc: '藏有上古秘宝，机关重重。', x: 80,  y: 420, npcId: 'npc_hermit',  npcName: '隐世高人', bookTag: '诛仙·荒古' },
];

export default class ExploreScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ExploreScene' });
        this._selectedPOI   = null;
        this._poiObjects    = [];
        this._currentWorld  = '诛仙·人间';
        this._currentLoc    = '太清殿附近';
        this._mapOffsetX    = 0;
        this._mapOffsetY    = 0;
    }

    preload() {}

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.game.events.emit('setNavActive', 'explore');

        // ── 背景 ──
        this.add.rectangle(W / 2, H / 2, W, H, INK);

        // ── 顶部栏 ──
        this._buildTopBar(W);

        // ── 地图区 ──
        this._buildMap(W, H);

        // ── POI 标记 ──
        this._buildPOIs();

        // ── POI 信息面板 ──
        this._buildInfoPanel(W, H);

        // 请求服务端地图数据
        gameClient.send(CMD.EXPLORE.cmd, CMD.EXPLORE.getMap, {
            worldIndex: 1,
        });

        // 监听地图数据
        gameClient.on(`${CMD.EXPLORE.cmd}_${CMD.EXPLORE.getMap}`, (data) => {
            if (data && data.pois) this._refreshPOIs(data.pois);
        });
    }

    _buildTopBar(W) {
        const bg = this.add.graphics();
        bg.fillStyle(0x0e0b09, 0.95);
        bg.fillRect(0, 0, W, 50);
        bg.lineStyle(1, GOLD, 0.25);
        bg.lineBetween(0, 50, W, 50);
        bg.setDepth(5);

        this.add.text(W / 2, 25, this._currentLoc, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '15px',
            color: '#f5ede0',
        }).setOrigin(0.5).setDepth(6);

        this._worldTagText = this.add.text(W - 12, 14, this._currentWorld, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: '#c9a84c',
        }).setOrigin(1, 0).setDepth(6);

        // 书籍切换按钮
        const switchBtn = this.add.text(12, 14, '⇄ 换书', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: 'rgba(201,168,76,0.7)',
        }).setDepth(6).setInteractive({ useHandCursor: true });

        switchBtn.on('pointerdown', () => {
            this.scene.start('BookSelectScene');
        });
    }

    _buildMap(W, H) {
        const mapY  = 50;
        const mapH  = H - HUD_H - mapY - 130; // 留出底部信息面板

        // 地图背景
        const mapBg = this.add.graphics();
        mapBg.fillStyle(0x0d1a0d, 1);
        mapBg.fillRect(0, mapY, W, mapH);
        mapBg.setDepth(1);

        // 网格
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1a3020, 0.8);
        const cellSize = 40;
        for (let gx = 0; gx <= W; gx += cellSize) {
            grid.lineBetween(gx, mapY, gx, mapY + mapH);
        }
        for (let gy = mapY; gy <= mapY + mapH; gy += cellSize) {
            grid.lineBetween(0, gy, W, gy);
        }
        grid.setDepth(2);

        // 地图装饰：山脉轮廓
        const terrain = this.add.graphics();
        terrain.fillStyle(0x1a2e1a, 0.6);
        // 几个山丘形状
        [
            [60, 280, 50, 35],
            [170, 310, 70, 40],
            [300, 240, 55, 32],
            [120, 400, 80, 45],
        ].forEach(([tx, ty, tw, th]) => {
            terrain.fillEllipse(tx, ty, tw, th);
        });
        terrain.setDepth(2);

        // 河流
        const river = this.add.graphics();
        river.lineStyle(3, 0x1a4060, 0.7);
        river.beginPath();
        river.moveTo(0, 290);
        river.bezierCurveTo(80, 310, 160, 270, 240, 300);
        river.bezierCurveTo(300, 320, 360, 290, 390, 310);
        river.strokePath();
        river.setDepth(2);

        this._mapBounds = { x: 0, y: mapY, w: W, h: mapH };
    }

    _buildPOIs() {
        this._poiObjects.forEach(p => {
            p.circle.destroy();
            p.label.destroy();
            p.zone.destroy();
            if (p.pulse) p.pulse.destroy();
        });
        this._poiObjects = [];

        DEMO_POIS.forEach(poi => {
            this._addPOI(poi);
        });
    }

    _addPOI(poi) {
        const offsetY = 50; // 顶部栏高度

        // 光晕
        const pulse = this.add.graphics();
        pulse.fillStyle(GOLD, 0.12);
        pulse.fillCircle(poi.x, poi.y + offsetY, 18);
        pulse.setDepth(3);

        // 圆点
        const circle = this.add.graphics();
        circle.fillStyle(GOLD, 1);
        circle.fillCircle(poi.x, poi.y + offsetY, 7);
        circle.lineStyle(2, 0xffffff, 0.5);
        circle.strokeCircle(poi.x, poi.y + offsetY, 7);
        circle.setDepth(4);

        // 标签
        const label = this.add.text(poi.x, poi.y + offsetY + 14, poi.name, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '10px',
            color: '#f5ede0',
            stroke: '#0e0b09',
            strokeThickness: 2,
        }).setOrigin(0.5, 0).setDepth(4);

        // 交互区
        const zone = this.add.zone(poi.x, poi.y + offsetY, 40, 40).setInteractive({ useHandCursor: true });
        zone.setDepth(5);
        zone.on('pointerdown', () => this._selectPOI(poi));
        zone.on('pointerover', () => {
            circle.clear();
            circle.fillStyle(0xffe88a, 1);
            circle.fillCircle(poi.x, poi.y + offsetY, 9);
        });
        zone.on('pointerout', () => {
            circle.clear();
            circle.fillStyle(GOLD, 1);
            circle.fillCircle(poi.x, poi.y + offsetY, 7);
            circle.lineStyle(2, 0xffffff, 0.5);
            circle.strokeCircle(poi.x, poi.y + offsetY, 7);
        });

        // 脉冲动画
        this.tweens.add({
            targets: pulse,
            alpha: { from: 0.12, to: 0 },
            scaleX: { from: 1, to: 1.8 },
            scaleY: { from: 1, to: 1.8 },
            duration: 1400,
            repeat: -1,
            ease: 'Sine.easeOut',
        });

        this._poiObjects.push({ poi, circle, label, zone, pulse });
    }

    _buildInfoPanel(W, H) {
        const panelY = H - HUD_H - 125;
        const panelH = 125;

        this._infoBg = this.add.graphics();
        this._infoBg.fillStyle(0x110e0b, 0.96);
        this._infoBg.fillRect(0, panelY, W, panelH);
        this._infoBg.lineStyle(1, GOLD, 0.3);
        this._infoBg.lineBetween(0, panelY, W, panelY);
        this._infoBg.setDepth(5);

        this._infoName = this.add.text(14, panelY + 14, '← 点击地图标记', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '15px',
            color: '#c9a84c',
        }).setDepth(6);

        this._infoDesc = this.add.text(14, panelY + 38, '探索世界，与命运中的人相遇', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: 'rgba(245,237,224,0.7)',
            wordWrap: { width: W - 28 },
        }).setDepth(6);

        this._infoNpcLabel = this.add.text(14, panelY + 72, '', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: 'rgba(201,168,76,0.8)',
        }).setDepth(6);

        // 进入按钮
        this._enterBtn = this.add.text(W - 14, panelY + 14, '进入对话 ›', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: '#c9a84c',
            backgroundColor: 'rgba(201,168,76,0.12)',
            padding: { x: 10, y: 5 },
        }).setOrigin(1, 0).setDepth(7).setInteractive({ useHandCursor: true });

        this._enterBtn.setAlpha(0);

        this._enterBtn.on('pointerdown', () => {
            if (this._selectedPOI) {
                this.scene.start('StoryScene', {
                    npcId:      this._selectedPOI.npcId,
                    worldIndex: 1,
                    npcName:    this._selectedPOI.npcName,
                    bookTag:    this._selectedPOI.bookTag,
                    fateValue:  0,
                });
            }
        });
        this._enterBtn.on('pointerover', () => this._enterBtn.setColor('#ffe88a'));
        this._enterBtn.on('pointerout',  () => this._enterBtn.setColor('#c9a84c'));
    }

    _selectPOI(poi) {
        this._selectedPOI = poi;
        this._infoName.setText(poi.name);
        this._infoDesc.setText(poi.desc);
        this._infoNpcLabel.setText(`NPC: ${poi.npcName}  |  ${poi.bookTag}`);
        this._enterBtn.setAlpha(1);

        // 请求 POI 详细信息
        gameClient.send(CMD.EXPLORE.cmd, CMD.EXPLORE.getPOI, { poiId: poi.id });
    }

    _refreshPOIs(serverPois) {
        // 如果服务器返回了 POI 数据，重新绘制
        if (!serverPois || serverPois.length === 0) return;
        this._buildPOIs();
    }

    update() {}

    shutdown() {
        gameClient.offAll(`${CMD.EXPLORE.cmd}_${CMD.EXPLORE.getMap}`);
    }
}
