/**
 * StoryScene.js  P01 剧情页
 * 与 NPC 对话，支持选项模式 + 自由输入模式
 */

import gameClient, { CMD } from '../network/GameClient.js';
import DialogueBox from '../ui/DialogueBox.js';
import FateBar from '../ui/FateBar.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const PAPER= 0xf5ede0;
const RED  = 0x8b2a2a;

const NPC_AREA_H  = 220;
const HUD_H       = 56;
const CHOICE_BTN_H = 38;
const DIALOGUE_Y   = NPC_AREA_H + 40;
const DIALOGUE_H   = 110;

export default class StoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StoryScene' });
        this._npcId      = 'npc_default';
        this._worldIndex = 1;
        this._freeMode   = false;
        this._choices    = [];
        this._choiceBtns = [];
        this._dialogBox  = null;
        this._fateBar    = null;
        this._npcName    = '???';
        this._bookTag    = '诛仙·人间';
        this._fateValue  = 0;
    }

    preload() {}

    create(data) {
        // 接收传入参数
        if (data) {
            this._npcId      = data.npcId      || this._npcId;
            this._worldIndex = data.worldIndex  || this._worldIndex;
            this._npcName    = data.npcName     || this._npcName;
            this._bookTag    = data.bookTag     || this._bookTag;
            this._fateValue  = data.fateValue   || 0;
        }

        const W = this.scale.width;
        const H = this.scale.height;

        // 通知 HUD 激活剧情
        this.game.events.emit('setNavActive', 'story');

        // ── 背景 ──
        this.add.rectangle(W / 2, H / 2, W, H, INK);

        // ── NPC 立绘区 ──
        this._buildNpcArea(W);

        // ── 缘分条 ──
        this._fateBar = new FateBar(this, 14, NPC_AREA_H + 8, W - 28, 7);
        this._fateBar.setValue(this._fateValue);

        // ── 对话框 ──
        this._dialogBox = new DialogueBox(this, 12, DIALOGUE_Y, W - 24, DIALOGUE_H);

        // ── 选项/输入切换按钮 ──
        this._buildToggleBtn(W, H);

        // ── 选项区 ──
        this._choicesContainer = this.add.container(0, 0);

        // ── HTML 自由输入区 ──
        this._setupFreeInput();

        // ── WebSocket 监听 ──
        this._setupListeners();

        // ── 发送开始对话请求 ──
        gameClient.send(CMD.STORY.cmd, CMD.STORY.startDialogue, {
            npcId: this._npcId,
            worldIndex: this._worldIndex,
        });

        // ── 点击对话框跳过打字机 ──
        const dialogZone = this.add.zone(12, DIALOGUE_Y, W - 24, DIALOGUE_H).setInteractive();
        dialogZone.setDepth(8);
        dialogZone.on('pointerdown', () => {
            if (this._dialogBox.isTyping()) {
                this._dialogBox.skipTyping();
            }
        });

        // 初始提示
        this._dialogBox.typeText('正在连接，请稍候...');
    }

    _buildNpcArea(W) {
        // 立绘背景
        const npcBg = this.add.graphics();
        npcBg.fillStyle(0x181210, 1);
        npcBg.fillRect(0, 0, W, NPC_AREA_H);

        // 立绘占位矩形
        const portraitW = 140;
        const portraitH = 180;
        const portraitX = (W - portraitW) / 2;
        const portraitY = (NPC_AREA_H - portraitH) / 2;

        const portrait = this.add.graphics();
        portrait.fillStyle(0x2a2218, 1);
        portrait.fillRoundedRect(portraitX, portraitY, portraitW, portraitH, 6);
        portrait.lineStyle(1, GOLD, 0.3);
        portrait.strokeRoundedRect(portraitX, portraitY, portraitW, portraitH, 6);

        // NPC 图标（简单人形）
        portrait.fillStyle(GOLD, 0.15);
        portrait.fillCircle(W / 2, portraitY + 50, 28); // 头
        portrait.fillRect(W / 2 - 20, portraitY + 82, 40, 60); // 身体

        // NPC 名字（左下角）
        this._npcNameText = this.add.text(14, NPC_AREA_H - 36, this._npcName, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '16px',
            color: '#f5ede0',
            stroke: '#0e0b09',
            strokeThickness: 3,
        }).setDepth(3);

        // 书籍标签（右下角）
        this._buildTag(W - 14, NPC_AREA_H - 28, this._bookTag);

        // 分隔线
        const divider = this.add.graphics();
        divider.lineStyle(1, GOLD, 0.3);
        divider.lineBetween(0, NPC_AREA_H, W, NPC_AREA_H);
    }

    _buildTag(x, y, text) {
        const padding = 8;
        const tagText = this.add.text(x, y, text, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: '#c9a84c',
        }).setOrigin(1, 0.5).setDepth(3);

        const bounds = tagText.getBounds();
        const tagBg = this.add.graphics();
        tagBg.lineStyle(1, GOLD, 0.5);
        tagBg.strokeRoundedRect(bounds.x - 4, bounds.y - 2, bounds.width + 8, bounds.height + 4, 3);
        tagBg.setDepth(2);
    }

    _buildToggleBtn(W, H) {
        const btnY = H - HUD_H - 10;
        const btnX = W - 50;

        const bg = this.add.graphics();
        bg.fillStyle(0x2a2218, 0.9);
        bg.fillRoundedRect(btnX - 26, btnY - 14, 52, 28, 14);
        bg.lineStyle(1, GOLD, 0.4);
        bg.strokeRoundedRect(btnX - 26, btnY - 14, 52, 28, 14);
        bg.setDepth(6);

        this._toggleBtnText = this.add.text(btnX, btnY, '自由', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(7);

        const zone = this.add.zone(btnX, btnY, 52, 28).setInteractive({ useHandCursor: true });
        zone.setDepth(8);
        zone.on('pointerdown', () => this._toggleMode());
    }

    _toggleMode() {
        this._freeMode = !this._freeMode;
        this._toggleBtnText.setText(this._freeMode ? '选项' : '自由');

        const inputArea = document.getElementById('story-input-area');
        if (inputArea) inputArea.style.display = this._freeMode ? 'block' : 'none';

        this._updateChoicesVisibility();
    }

    _setupFreeInput() {
        const btnSend = document.getElementById('btn-story-send');
        const input   = document.getElementById('story-free-input');
        const inputArea = document.getElementById('story-input-area');
        if (inputArea) inputArea.style.display = 'none';

        const doSend = () => {
            if (!input) return;
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            gameClient.send(CMD.STORY.cmd, CMD.STORY.sendFreeInput, {
                npcId: this._npcId,
                worldIndex: this._worldIndex,
                text,
            });
            this._dialogBox.typeText('...');
        };

        if (btnSend) btnSend.addEventListener('click', doSend);
        if (input) {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') doSend();
            });
        }
    }

    _setupListeners() {
        const storyKey = `${CMD.STORY.cmd}_${CMD.STORY.startDialogue}`;
        const choiceKey = `${CMD.STORY.cmd}_${CMD.STORY.sendChoice}`;
        const freeKey   = `${CMD.STORY.cmd}_${CMD.STORY.sendFreeInput}`;

        this._handleDialogue = (data) => this._onDialogueData(data);
        gameClient.on(storyKey,  this._handleDialogue);
        gameClient.on(choiceKey, this._handleDialogue);
        gameClient.on(freeKey,   this._handleDialogue);
    }

    _onDialogueData(data) {
        if (!data) return;

        // 更新 NPC 名
        if (data.npcName) {
            this._npcName = data.npcName;
            this._npcNameText.setText(data.npcName);
        }

        // 更新缘分值
        if (data.fateValue !== undefined) {
            this._fateBar.animateTo(data.fateValue);
        }

        // 更新对话文字
        const text = data.dialogue || data.text || data.message || '';
        if (text) {
            this._dialogBox.typeText(text, () => {
                if (!this._freeMode) this._showChoices(data.choices || []);
            });
        } else {
            if (!this._freeMode) this._showChoices(data.choices || []);
        }
    }

    _showChoices(choices) {
        // 清除旧按钮
        this._clearChoices();
        this._choices = choices;

        if (!choices || choices.length === 0) return;

        const W    = this.scale.width;
        const H    = this.scale.height;
        const startY = DIALOGUE_Y + DIALOGUE_H + 10;
        const btnW   = W - 24;

        choices.forEach((choice, i) => {
            const y = startY + i * (CHOICE_BTN_H + 6);
            const btn = this._makeChoiceBtn(12, y, btnW, CHOICE_BTN_H, choice.text || choice, i);
            this._choiceBtns.push(btn);
        });
    }

    _makeChoiceBtn(x, y, w, h, text, index) {
        const bg = this.add.graphics();
        bg.fillStyle(0x1e1810, 0.9);
        bg.fillRoundedRect(x, y, w, h, 5);
        bg.lineStyle(1, GOLD, 0.4);
        bg.strokeRoundedRect(x, y, w, h, 5);
        bg.setDepth(6);

        const label = this.add.text(x + 12, y + h / 2, text, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: '#f5ede0',
            wordWrap: { width: w - 24 },
        }).setOrigin(0, 0.5).setDepth(7);

        const arrow = this.add.text(x + w - 14, y + h / 2, '›', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '16px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(7);

        const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
        zone.setDepth(8);
        zone.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x2a2218, 1);
            bg.fillRoundedRect(x, y, w, h, 5);
            bg.lineStyle(1, GOLD, 0.7);
            bg.strokeRoundedRect(x, y, w, h, 5);
        });
        zone.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x1e1810, 0.9);
            bg.fillRoundedRect(x, y, w, h, 5);
            bg.lineStyle(1, GOLD, 0.4);
            bg.strokeRoundedRect(x, y, w, h, 5);
        });
        zone.on('pointerdown', () => {
            this._onChoiceSelected(index, text);
        });

        return { bg, label, arrow, zone };
    }

    _onChoiceSelected(index, text) {
        this._clearChoices();
        this._dialogBox.typeText('...');
        gameClient.send(CMD.STORY.cmd, CMD.STORY.sendChoice, {
            npcId: this._npcId,
            worldIndex: this._worldIndex,
            choiceIndex: index,
            choiceText: text,
        });
    }

    _clearChoices() {
        this._choiceBtns.forEach(btn => {
            btn.bg.destroy();
            btn.label.destroy();
            btn.arrow.destroy();
            btn.zone.destroy();
        });
        this._choiceBtns = [];
    }

    _updateChoicesVisibility() {
        this._choiceBtns.forEach(btn => {
            btn.bg.setVisible(!this._freeMode);
            btn.label.setVisible(!this._freeMode);
            btn.arrow.setVisible(!this._freeMode);
            btn.zone.setActive(!this._freeMode);
        });
    }

    update() {}

    shutdown() {
        // 清理监听器
        const storyKey  = `${CMD.STORY.cmd}_${CMD.STORY.startDialogue}`;
        const choiceKey = `${CMD.STORY.cmd}_${CMD.STORY.sendChoice}`;
        const freeKey   = `${CMD.STORY.cmd}_${CMD.STORY.sendFreeInput}`;
        gameClient.off(storyKey,  this._handleDialogue);
        gameClient.off(choiceKey, this._handleDialogue);
        gameClient.off(freeKey,   this._handleDialogue);

        // 隐藏输入框
        const inputArea = document.getElementById('story-input-area');
        if (inputArea) inputArea.style.display = 'none';

        // 结束对话
        gameClient.send(CMD.STORY.cmd, CMD.STORY.endDialogue, {
            npcId: this._npcId,
            worldIndex: this._worldIndex,
        });

        if (this._dialogBox) this._dialogBox.destroy();
        if (this._fateBar)   this._fateBar.destroy();
    }
}
