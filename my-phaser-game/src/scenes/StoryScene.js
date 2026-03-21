/**
 * StoryScene.js  P01 剧情页
 * 与 NPC 对话，支持选项模式 + 自由输入模式
 * 使用 REST API（gameClient.startDialogue / sendChoice / sendFreeInput / endDialogue）
 */

import gameClient from '../network/GameClient.js';
import DialogueBox from '../ui/DialogueBox.js';
import FateBar from '../ui/FateBar.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;

const NPC_AREA_H   = 220;
const HUD_H        = 56;
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
        this._sessionId  = null;
        this._busy       = false; // 防止重复请求
    }

    preload() {}

    create(data) {
        if (data) {
            this._npcId      = data.npcId      || this._npcId;
            this._worldIndex = data.worldIndex  || this._worldIndex;
            this._npcName    = data.npcName     || this._npcName;
            this._bookTag    = data.bookTag     || this._bookTag;
            this._fateValue  = data.fateValue   || 0;
        }

        const W = this.scale.width;
        const H = this.scale.height;

        this.game.events.emit('setNavActive', 'story');

        this.add.rectangle(W / 2, H / 2, W, H, INK);

        this._buildNpcArea(W);

        this._fateBar = new FateBar(this, 14, NPC_AREA_H + 8, W - 28, 7);
        this._fateBar.setValue(this._fateValue);

        this._dialogBox = new DialogueBox(this, 12, DIALOGUE_Y, W - 24, DIALOGUE_H);

        this._buildToggleBtn(W, H);

        this._choicesContainer = this.add.container(0, 0);

        this._setupFreeInput();

        // 点击对话框跳过打字机
        const dialogZone = this.add.zone(12, DIALOGUE_Y, W - 24, DIALOGUE_H).setInteractive();
        dialogZone.setDepth(8);
        dialogZone.on('pointerdown', () => {
            if (this._dialogBox.isTyping()) this._dialogBox.skipTyping();
        });

        this._dialogBox.typeText('正在连接，请稍候...');
        this._startDialogue();
    }

    // ── REST 对话流程 ──────────────────────────────

    async _startDialogue() {
        try {
            const data = await gameClient.startDialogue(this._npcId, this._worldIndex);
            this._sessionId = data.sessionId;
            this._onDialogueData(data);
        } catch (e) {
            this._dialogBox.typeText('连接失败：' + (e.message || '请检查服务器'));
        }
    }

    async _sendChoice(choiceId, choiceText) {
        if (this._busy || !this._sessionId) return;
        this._busy = true;
        this._clearChoices();
        this._dialogBox.typeText('...');
        try {
            const data = await gameClient.sendChoice(
                this._sessionId, choiceId, this._npcId, this._worldIndex
            );
            this._onDialogueData(data);
        } catch (e) {
            this._dialogBox.typeText('发送失败：' + (e.message || ''));
        } finally {
            this._busy = false;
        }
    }

    async _sendFreeText(text) {
        if (this._busy || !this._sessionId || !text) return;
        this._busy = true;
        this._dialogBox.typeText('...');
        try {
            const data = await gameClient.sendFreeInput(
                this._sessionId, text, this._npcId, this._worldIndex
            );
            this._onDialogueData(data);
        } catch (e) {
            this._dialogBox.typeText('发送失败：' + (e.message || ''));
        } finally {
            this._busy = false;
        }
    }

    _onDialogueData(data) {
        if (!data) return;

        if (data.npcName) {
            this._npcName = data.npcName;
            if (this._npcNameText) this._npcNameText.setText(data.npcName);
        }

        if (data.fateDelta && this._fateBar) {
            this._fateValue = Math.max(0, Math.min(100, this._fateValue + (data.fateDelta || 0)));
            this._fateBar.animateTo(this._fateValue);
        }

        const text = data.text || data.dialogue || data.message || '';
        const rawChoices = data.choicesJson
            ? (typeof data.choicesJson === 'string' ? JSON.parse(data.choicesJson) : data.choicesJson)
            : (data.choices || []);

        if (text) {
            this._dialogBox.typeText(text, () => {
                if (!this._freeMode) this._showChoices(rawChoices);
            });
        } else {
            if (!this._freeMode) this._showChoices(rawChoices);
        }
    }

    // ── UI 构建 ────────────────────────────────────

    _buildNpcArea(W) {
        const npcBg = this.add.graphics();
        npcBg.fillStyle(0x181210, 1);
        npcBg.fillRect(0, 0, W, NPC_AREA_H);

        const portraitW = 140, portraitH = 180;
        const portraitX = (W - portraitW) / 2;
        const portraitY = (NPC_AREA_H - portraitH) / 2;

        const portrait = this.add.graphics();
        portrait.fillStyle(0x2a2218, 1);
        portrait.fillRoundedRect(portraitX, portraitY, portraitW, portraitH, 6);
        portrait.lineStyle(1, GOLD, 0.3);
        portrait.strokeRoundedRect(portraitX, portraitY, portraitW, portraitH, 6);
        portrait.fillStyle(GOLD, 0.15);
        portrait.fillCircle(W / 2, portraitY + 50, 28);
        portrait.fillRect(W / 2 - 20, portraitY + 82, 40, 60);

        this._npcNameText = this.add.text(14, NPC_AREA_H - 36, this._npcName, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '16px', color: '#f5ede0',
            stroke: '#0e0b09', strokeThickness: 3,
        }).setDepth(3);

        this._buildTag(W - 14, NPC_AREA_H - 28, this._bookTag);

        const divider = this.add.graphics();
        divider.lineStyle(1, GOLD, 0.3);
        divider.lineBetween(0, NPC_AREA_H, W, NPC_AREA_H);
    }

    _buildTag(x, y, text) {
        const tagText = this.add.text(x, y, text, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px', color: '#c9a84c',
        }).setOrigin(1, 0.5).setDepth(3);

        const b = tagText.getBounds();
        const tagBg = this.add.graphics();
        tagBg.lineStyle(1, GOLD, 0.5);
        tagBg.strokeRoundedRect(b.x - 4, b.y - 2, b.width + 8, b.height + 4, 3);
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
            fontSize: '12px', color: '#c9a84c',
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
        const btnSend   = document.getElementById('btn-story-send');
        const input     = document.getElementById('story-free-input');
        const inputArea = document.getElementById('story-input-area');
        if (inputArea) inputArea.style.display = 'none';

        const doSend = () => {
            if (!input) return;
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            this._sendFreeText(text);
        };

        if (btnSend) btnSend.addEventListener('click', doSend);
        if (input)   input.addEventListener('keydown', e => { if (e.key === 'Enter') doSend(); });
    }

    _showChoices(choices) {
        this._clearChoices();
        this._choices = choices;
        if (!choices || choices.length === 0) return;

        const W      = this.scale.width;
        const startY = DIALOGUE_Y + DIALOGUE_H + 10;
        const btnW   = W - 24;

        choices.forEach((choice, i) => {
            const y   = startY + i * (CHOICE_BTN_H + 6);
            // choice 可能是 { id, text } 或直接是字符串
            const id  = (typeof choice === 'object') ? (choice.id ?? i) : i;
            const txt = (typeof choice === 'object') ? (choice.text || String(choice)) : String(choice);
            const btn = this._makeChoiceBtn(12, y, btnW, CHOICE_BTN_H, txt, id);
            this._choiceBtns.push(btn);
        });
    }

    _makeChoiceBtn(x, y, w, h, text, choiceId) {
        const bg = this.add.graphics();
        bg.fillStyle(0x1e1810, 0.9);
        bg.fillRoundedRect(x, y, w, h, 5);
        bg.lineStyle(1, GOLD, 0.4);
        bg.strokeRoundedRect(x, y, w, h, 5);
        bg.setDepth(6);

        const label = this.add.text(x + 12, y + h / 2, text, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px', color: '#f5ede0',
            wordWrap: { width: w - 24 },
        }).setOrigin(0, 0.5).setDepth(7);

        const arrow = this.add.text(x + w - 14, y + h / 2, '›', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '16px', color: '#c9a84c',
        }).setOrigin(0.5).setDepth(7);

        const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true }).setDepth(8);

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
        zone.on('pointerdown', () => this._sendChoice(choiceId, text));

        return { bg, label, arrow, zone };
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
        if (this._sessionId) {
            gameClient.endDialogue(this._sessionId).catch(() => {});
            this._sessionId = null;
        }
        const inputArea = document.getElementById('story-input-area');
        if (inputArea) inputArea.style.display = 'none';
        if (this._dialogBox) this._dialogBox.destroy();
        if (this._fateBar)   this._fateBar.destroy();
    }
}
