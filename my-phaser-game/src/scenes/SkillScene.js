/**
 * SkillScene.js  P09 技能树
 * 树形布局展示技能节点，点击学习/升级
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const HUD_H = 56;

// 技能树示例数据（树形结构）
const SKILL_TREE = {
    id: 'root',
    name: '基础内功',
    level: 3,
    maxLevel: 5,
    learned: true,
    desc: '修炼内力，提升所有属性',
    x: 195, y: 80,
    children: [
        {
            id: 'sword',
            name: '御剑术',
            level: 2,
            maxLevel: 5,
            learned: true,
            desc: '驭剑飞行，攻击+100',
            x: 90, y: 180,
            children: [
                { id: 'sword2', name: '剑雨', level: 0, maxLevel: 3, learned: false, desc: '召唤万剑齐发', x: 50, y: 300, children: [] },
                { id: 'sword3', name: '斩魄', level: 0, maxLevel: 3, learned: false, desc: '无视防御斩击', x: 130, y: 300, children: [] },
            ],
        },
        {
            id: 'spell',
            name: '法术',
            level: 1,
            maxLevel: 5,
            learned: true,
            desc: '掌握基础法术',
            x: 300, y: 180,
            children: [
                { id: 'fire', name: '真火', level: 0, maxLevel: 3, learned: false, desc: '三昧真火，灼烧敌人', x: 250, y: 300, children: [] },
                { id: 'ice',  name: '寒冰', level: 0, maxLevel: 3, learned: false, desc: '冰封天地，减速敌人', x: 340, y: 300, children: [] },
            ],
        },
    ],
};

export default class SkillScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SkillScene' });
        this._skillPoints = 5;
        this._nodes = [];
    }

    preload() {}

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, INK);
        this._buildHeader(W);
        this._buildTreeLines(SKILL_TREE);
        this._buildNodes(SKILL_TREE);
        this._buildBottomBar(W, H);

        gameClient.send(CMD.SKILL.cmd, CMD.SKILL.getTree, {});
        gameClient.on(`${CMD.SKILL.cmd}_${CMD.SKILL.getTree}`, (d) => {
            if (d) console.log('[SkillScene] 获取技能树数据', d);
        });
    }

    _buildHeader(W) {
        const bg = this.add.graphics();
        bg.fillStyle(0x110e0b, 0.96);
        bg.fillRect(0, 0, W, 50);
        bg.lineStyle(1, GOLD, 0.25);
        bg.lineBetween(0, 50, W, 50);
        bg.setDepth(5);

        this.add.text(W / 2, 25, '技能树', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '17px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(6);

        this._spText = this.add.text(W - 14, 25, `技能点: ${this._skillPoints}`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: '#80cc60',
        }).setOrigin(1, 0.5).setDepth(6);

        const back = this.add.text(16, 25, '‹ 返回', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: 'rgba(201,168,76,0.7)',
        }).setOrigin(0, 0.5).setDepth(6).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.stop('SkillScene'));
    }

    _buildTreeLines(node) {
        const gfx = this.add.graphics();
        gfx.setDepth(1);
        this._drawLines(gfx, node);
    }

    _drawLines(gfx, node) {
        if (!node.children) return;
        node.children.forEach(child => {
            gfx.lineStyle(2, node.learned && child.learned ? GOLD : 0x3a3020,
                node.learned && child.learned ? 0.6 : 0.3);
            gfx.lineBetween(node.x, node.y, child.x, child.y);
            this._drawLines(gfx, child);
        });
    }

    _buildNodes(node) {
        this._addNode(node);
        if (node.children) node.children.forEach(c => this._buildNodes(c));
    }

    _addNode(node) {
        const r = 26;
        const nodeGfx = this.add.graphics();

        if (node.learned) {
            nodeGfx.fillStyle(0x2a2010, 1);
            nodeGfx.fillCircle(node.x, node.y, r);
            nodeGfx.lineStyle(2, GOLD, 0.9);
            nodeGfx.strokeCircle(node.x, node.y, r);
        } else {
            nodeGfx.fillStyle(0x1a1610, 1);
            nodeGfx.fillCircle(node.x, node.y, r);
            nodeGfx.lineStyle(1, 0x3a3020, 0.6);
            nodeGfx.strokeCircle(node.x, node.y, r);
        }
        nodeGfx.setDepth(3);

        // 技能名
        const nameText = this.add.text(node.x, node.y - 5, node.name.length > 3 ? node.name.slice(0, 3) : node.name, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: node.learned ? '#c9a84c' : 'rgba(245,237,224,0.4)',
        }).setOrigin(0.5).setDepth(4);

        // 等级
        const lvText = this.add.text(node.x, node.y + 10, node.learned ? `${node.level}/${node.maxLevel}` : '锁定', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '9px',
            color: node.learned ? '#80cc60' : 'rgba(245,237,224,0.3)',
        }).setOrigin(0.5).setDepth(4);

        const zone = this.add.zone(node.x, node.y, r * 2, r * 2)
            .setInteractive({ useHandCursor: true }).setDepth(5);

        zone.on('pointerdown', () => this._onNodeClick(node, nodeGfx, nameText, lvText));

        this._nodes.push({ node, nodeGfx, nameText, lvText, zone });
    }

    _onNodeClick(node, nodeGfx, nameText, lvText) {
        const W = this.scale.width;
        const H = this.scale.height;

        // 弹出技能详情
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, W, H);
        overlay.setDepth(20).setInteractive();

        const panelW = W - 60;
        const panelH = 200;
        const panelX = 30;
        const panelY = (H - panelH) / 2;

        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x1a1610, 1);
        panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
        panelBg.lineStyle(1, GOLD, 0.6);
        panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
        panelBg.setDepth(21);

        const titleT = this.add.text(panelX + panelW / 2, panelY + 22, node.name, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#c9a84c',
        }).setOrigin(0.5).setDepth(22);

        const levelT = this.add.text(panelX + 16, panelY + 56, `等级：${node.level} / ${node.maxLevel}`, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#f5ede0',
        }).setDepth(22);

        const descT = this.add.text(panelX + 16, panelY + 84, node.desc, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: 'rgba(245,237,224,0.75)',
            wordWrap: { width: panelW - 32 },
        }).setDepth(22);

        // 学习/升级按钮
        const canUpgrade = node.learned && node.level < node.maxLevel;
        const canLearn   = !node.learned;
        const btnLabel = canLearn ? '学习（消耗1技能点）' : (canUpgrade ? '升级（消耗1技能点）' : '已满级');
        const btnActive = (canLearn || canUpgrade) && this._skillPoints > 0;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(btnActive ? 0x2a2010 : 0x1a1610, 1);
        btnBg.fillRoundedRect(panelX + 16, panelY + 150, panelW - 80, 34, 5);
        btnBg.lineStyle(1, btnActive ? GOLD : 0x3a3020, btnActive ? 0.7 : 0.3);
        btnBg.strokeRoundedRect(panelX + 16, panelY + 150, panelW - 80, 34, 5);
        btnBg.setDepth(22);

        const btnT = this.add.text(panelX + 16 + (panelW - 80) / 2, panelY + 167, btnLabel, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px',
            color: btnActive ? '#c9a84c' : 'rgba(245,237,224,0.3)',
        }).setOrigin(0.5).setDepth(23);

        const objs = [overlay, panelBg, titleT, levelT, descT, btnBg, btnT];

        if (btnActive) {
            const btnZone = this.add.zone(panelX + 16 + (panelW - 80) / 2, panelY + 167, panelW - 80, 34)
                .setInteractive({ useHandCursor: true }).setDepth(24);
            objs.push(btnZone);

            btnZone.on('pointerdown', () => {
                this._skillPoints--;
                this._spText.setText(`技能点: ${this._skillPoints}`);
                node.level = Math.min(node.maxLevel, node.level + 1);
                node.learned = true;
                lvText.setText(`${node.level}/${node.maxLevel}`);
                nameText.setColor('#c9a84c');

                gameClient.send(CMD.SKILL.cmd, canLearn ? CMD.SKILL.learn : CMD.SKILL.upgrade, {
                    skillId: node.id,
                });
                objs.forEach(o => o.destroy());
            });
        }

        // 关闭
        const closeT = this.add.text(panelX + panelW - 16, panelY + 16, '✕', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '15px', color: 'rgba(201,168,76,0.7)',
        }).setOrigin(1, 0).setDepth(23).setInteractive({ useHandCursor: true });
        objs.push(closeT);

        const doClose = () => objs.forEach(o => o.destroy());
        closeT.on('pointerdown', doClose);
        overlay.on('pointerdown', doClose);
    }

    _buildBottomBar(W, H) {
        const barY = H - HUD_H - 46;
        const bg = this.add.graphics();
        bg.fillStyle(0x110e0b, 0.9);
        bg.fillRect(0, barY, W, 46);
        bg.lineStyle(1, GOLD, 0.2);
        bg.lineBetween(0, barY, W, barY);
        bg.setDepth(5);

        this.add.text(14, barY + 10, '※ 技能点可通过完成任务、轮回等方式获得', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '11px',
            color: 'rgba(201,168,76,0.5)',
        }).setDepth(6);
    }

    update() {}

    shutdown() {
        gameClient.offAll(`${CMD.SKILL.cmd}_${CMD.SKILL.getTree}`);
    }
}
