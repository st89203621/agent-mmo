/**
 * PetScene.js  P11 宠物管理
 * 展示宠物列表，支持喂食/改名/放生
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const HUD_H = 56;

const DEMO_PETS = [
    { id: 'p1', name: '小白',   type: '白虎',   level: 12, hunger: 75, mood: 90, skill: '虎啸' },
    { id: 'p2', name: '火灵',   type: '火凤凰', level: 8,  hunger: 30, mood: 60, skill: '凤焰' },
    { id: 'p3', name: '墨鳞',   type: '黑龙',   level: 20, hunger: 90, mood: 85, skill: '龙息' },
    { id: 'p4', name: '云雾',   type: '仙鹤',   level: 5,  hunger: 50, mood: 70, skill: '翔云' },
];

export default class PetScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PetScene' });
        this._pets = [];
        this._selectedPet = null;
        this._petObjs = [];
    }

    preload() {}

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, INK);
        this._buildHeader(W);
        this._pets = DEMO_PETS;
        this._buildPetList(W, H);

        gameClient.send(CMD.PET.cmd, CMD.PET.getList, {});
        gameClient.on(`${CMD.PET.cmd}_${CMD.PET.getList}`, (d) => {
            if (d && d.pets) {
                this._pets = d.pets;
                this._buildPetList(W, H);
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

        this.add.text(W / 2, 25, '宠物管理', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '17px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(6);

        const back = this.add.text(16, 25, '‹ 返回', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: 'rgba(201,168,76,0.7)',
        }).setOrigin(0, 0.5).setDepth(6).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.stop('PetScene'));
    }

    _buildPetList(W, H) {
        this._petObjs.forEach(p => p.forEach(o => o.destroy && o.destroy()));
        this._petObjs = [];

        const cardH = 100;
        const gap   = 8;
        const startY = 58;

        this._pets.forEach((pet, i) => {
            const y = startY + i * (cardH + gap);
            const objs = this._buildPetCard(8, y, W - 16, cardH, pet);
            this._petObjs.push(objs);
        });
    }

    _buildPetCard(x, y, w, h, pet) {
        const isSelected = this._selectedPet && this._selectedPet.id === pet.id;

        const bg = this.add.graphics();
        bg.fillStyle(isSelected ? 0x1a2010 : 0x1a1610, 1);
        bg.fillRoundedRect(x, y, w, h, 6);
        bg.lineStyle(1, isSelected ? 0x6aaa4a : GOLD, isSelected ? 0.7 : 0.3);
        bg.strokeRoundedRect(x, y, w, h, 6);
        bg.setDepth(2);

        // 宠物图标占位
        const iconGfx = this.add.graphics();
        iconGfx.fillStyle(GOLD, 0.12);
        iconGfx.fillRoundedRect(x + 8, y + 12, 70, 76, 5);
        iconGfx.lineStyle(1, GOLD, 0.25);
        iconGfx.strokeRoundedRect(x + 8, y + 12, 70, 76, 5);
        // 宠物类型首字
        const iconChar = this.add.text(x + 43, y + 50, pet.type[0], {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '28px', color: 'rgba(201,168,76,0.5)',
        }).setOrigin(0.5).setDepth(4);
        iconGfx.setDepth(3);

        // 名字+类型
        const nameT = this.add.text(x + 90, y + 14, `${pet.name}（${pet.type}）`, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: '#f5ede0',
        }).setDepth(3);

        const levelT = this.add.text(x + 90, y + 36, `Lv.${pet.level}  技能：${pet.skill}`, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '11px', color: 'rgba(245,237,224,0.6)',
        }).setDepth(3);

        // 饱食/心情条
        const barY1 = y + 60;
        const barY2 = y + 76;
        const barW  = w - 100;

        const hungerBar = this._miniBar(x + 90, barY1, barW, 8, pet.hunger / 100, 0xb06020, '饱食');
        const moodBar   = this._miniBar(x + 90, barY2, barW, 8, pet.mood   / 100, 0x4a8a4a, '心情');

        // 操作按钮
        const btnFeed = this._smallBtn(x + w - 90, y + 14, '喂食', '#c9a84c', () => {
            gameClient.send(CMD.PET.cmd, CMD.PET.feed, { petId: pet.id });
        });
        const btnRelease = this._smallBtn(x + w - 90, y + 56, '放生', '#e07050', () => {
            this._confirmRelease(pet);
        });

        const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true }).setDepth(5);
        zone.on('pointerdown', () => {
            this._selectedPet = pet;
            this._buildPetList(this.scale.width, this.scale.height);
        });

        return [bg, iconGfx, iconChar, nameT, levelT, zone, ...hungerBar, ...moodBar, ...btnFeed, ...btnRelease];
    }

    _miniBar(x, y, w, h, ratio, color, label) {
        const track = this.add.graphics();
        track.fillStyle(0x2a2218, 1);
        track.fillRoundedRect(x, y, w, h, h / 2);
        track.setDepth(3);

        const fill = this.add.graphics();
        fill.fillStyle(color, 1);
        fill.fillRoundedRect(x, y, Math.max(4, w * ratio), h, h / 2);
        fill.setDepth(4);

        const lbl = this.add.text(x - 4, y + h / 2, label, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '9px', color: 'rgba(245,237,224,0.5)',
        }).setOrigin(1, 0.5).setDepth(4);

        return [track, fill, lbl];
    }

    _smallBtn(x, y, label, color, callback) {
        const w = 60, h = 26;
        const bg = this.add.graphics();
        bg.fillStyle(0x1e1a12, 1);
        bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
        bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(color).color, 0.5);
        bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4);
        bg.setDepth(4);

        const t = this.add.text(x, y, label, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color,
        }).setOrigin(0.5).setDepth(5);

        const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(6);
        zone.on('pointerdown', (ptr, lx, ly, event) => {
            event.stopPropagation();
            callback();
        });

        return [bg, t, zone];
    }

    _confirmRelease(pet) {
        const W = this.scale.width;
        const H = this.scale.height;

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, W, H);
        overlay.setDepth(20).setInteractive();

        const panelW = 280, panelH = 140;
        const panelX = (W - panelW) / 2;
        const panelY = (H - panelH) / 2;

        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x1a1610, 1);
        panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
        panelBg.lineStyle(1, GOLD, 0.6);
        panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
        panelBg.setDepth(21);

        const msg = this.add.text(panelX + panelW / 2, panelY + 35, `确认放生 ${pet.name} 吗？`, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '15px', color: '#f5ede0',
        }).setOrigin(0.5).setDepth(22);

        const sub = this.add.text(panelX + panelW / 2, panelY + 62, '此操作不可撤销', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: 'rgba(245,237,224,0.5)',
        }).setOrigin(0.5).setDepth(22);

        const objs = [overlay, panelBg, msg, sub];

        const confirmBtn = this._smallBtn(panelX + 80, panelY + 105, '确认', '#e07050', () => {
            gameClient.send(CMD.PET.cmd, CMD.PET.release, { petId: pet.id });
            this._pets = this._pets.filter(p => p.id !== pet.id);
            this._buildPetList(W, H);
            objs.forEach(o => o.destroy());
            confirmBtn.forEach(o => o.destroy());
            cancelBtn.forEach(o => o.destroy());
        });

        const cancelBtn = this._smallBtn(panelX + panelW - 80, panelY + 105, '取消', '#c9a84c', () => {
            objs.forEach(o => o.destroy());
            confirmBtn.forEach(o => o.destroy());
            cancelBtn.forEach(o => o.destroy());
        });
    }

    update() {}

    shutdown() {
        gameClient.offAll(`${CMD.PET.cmd}_${CMD.PET.getList}`);
    }
}
