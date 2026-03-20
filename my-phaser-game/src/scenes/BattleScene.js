/**
 * BattleScene.js  P02 对战页
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const PAPER= 0xf5ede0;
const RED  = 0x8b2a2a;
const HUD_H = 56;

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this._playerHP    = 100;
        this._playerMaxHP = 100;
        this._enemyHP     = 100;
        this._enemyMaxHP  = 100;
        this._turn        = 'player';
        this._battleLog   = [];
        this._actionBtns  = [];
        this._enemyName   = '妖怪';
    }

    preload() {}

    create(data) {
        if (data) {
            this._enemyName   = data.enemyName   || this._enemyName;
            this._enemyMaxHP  = data.enemyMaxHP  || 100;
            this._enemyHP     = data.enemyHP     || this._enemyMaxHP;
            this._playerMaxHP = data.playerMaxHP || 100;
            this._playerHP    = data.playerHP    || this._playerMaxHP;
        }

        const W = this.scale.width;
        const H = this.scale.height;

        // 背景
        this.add.rectangle(W / 2, H / 2, W, H, 0x0a0808);

        // 战场背景装饰
        this._drawBattlefield(W, H);

        // 敌方区（上方）
        this._buildEnemyArea(W);

        // 玩家区（中）
        this._buildPlayerArea(W);

        // 战斗日志
        this._buildBattleLog(W, H);

        // 行动按钮
        this._buildActionButtons(W, H);

        // 监听战斗消息
        gameClient.on(`${CMD.BATTLE.cmd}_${CMD.BATTLE.action}`, (d) => this._onBattleAction(d));
        gameClient.on(`${CMD.BATTLE.cmd}_${CMD.BATTLE.start}`,  (d) => this._onBattleStart(d));
    }

    _drawBattlefield(W, H) {
        const gfx = this.add.graphics();
        // 地面线
        gfx.lineStyle(2, 0x3a2a1a, 0.6);
        gfx.lineBetween(0, H / 2 + 20, W, H / 2 + 20);
        // 天空渐变
        gfx.fillGradientStyle(0x0a0808, 0x0a0808, 0x151010, 0x151010, 1);
        gfx.fillRect(0, 0, W, H / 2);
        // 月亮
        gfx.lineStyle(1, GOLD, 0.25);
        gfx.strokeCircle(W * 0.8, 60, 30);
    }

    _buildEnemyArea(W) {
        // 敌方立绘占位
        const ex = W / 2;
        const ey = 100;
        const ew = 110;
        const eh = 130;

        const enemyGfx = this.add.graphics();
        enemyGfx.fillStyle(0x2a1a1a, 1);
        enemyGfx.fillRoundedRect(ex - ew / 2, ey - eh / 2, ew, eh, 6);
        enemyGfx.lineStyle(1, RED, 0.4);
        enemyGfx.strokeRoundedRect(ex - ew / 2, ey - eh / 2, ew, eh, 6);
        // 简单怪物形状
        enemyGfx.fillStyle(0x4a2020, 0.5);
        enemyGfx.fillCircle(ex, ey - 20, 22);
        enemyGfx.fillRect(ex - 18, ey - 2, 36, 50);

        // 敌方名字
        this.add.text(ex, ey - eh / 2 - 14, this._enemyName, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '14px',
            color: '#e05555',
        }).setOrigin(0.5);

        // 敌方血条
        this._enemyHpBar = this._buildHpBar(ex - 80, ey + 80, 160, 8, this._enemyHP / this._enemyMaxHP, RED);
        this._enemyHpText = this.add.text(ex, ey + 96, `${this._enemyHP} / ${this._enemyMaxHP}`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: '#e05555',
        }).setOrigin(0.5);
    }

    _buildPlayerArea(W) {
        const px = W / 2;
        const py = 300;
        const pw = 90;
        const ph = 110;

        const playerGfx = this.add.graphics();
        playerGfx.fillStyle(0x1a1a2a, 1);
        playerGfx.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 6);
        playerGfx.lineStyle(1, GOLD, 0.4);
        playerGfx.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 6);
        // 玩家形状
        playerGfx.fillStyle(0x2a2a4a, 0.5);
        playerGfx.fillCircle(px, py - 16, 20);
        playerGfx.fillRect(px - 14, py + 2, 28, 42);

        // 玩家血条
        this._playerHpBar = this._buildHpBar(px - 80, py + 70, 160, 8, this._playerHP / this._playerMaxHP, 0x3a8a3a);
        this._playerHpText = this.add.text(px, py + 86, `${this._playerHP} / ${this._playerMaxHP}`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: '#5aba5a',
        }).setOrigin(0.5);

        // 玩家标签
        this.add.text(px, py - ph / 2 - 12, '我', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: '#c9a84c',
        }).setOrigin(0.5);
    }

    _buildHpBar(x, y, w, h, ratio, color) {
        const track = this.add.graphics();
        track.fillStyle(0x2a2a2a, 1);
        track.fillRoundedRect(x, y, w, h, h / 2);

        const fill = this.add.graphics();
        fill.fillStyle(color, 1);
        fill.fillRoundedRect(x, y, Math.max(4, w * ratio), h, h / 2);

        return { track, fill, x, y, w, h, color };
    }

    _updateHpBar(barObj, ratio) {
        barObj.fill.clear();
        barObj.fill.fillStyle(barObj.color, 1);
        barObj.fill.fillRoundedRect(
            barObj.x, barObj.y,
            Math.max(4, barObj.w * Math.max(0, Math.min(1, ratio))),
            barObj.h, barObj.h / 2
        );
    }

    _buildBattleLog(W, H) {
        const logY = 410;
        const logH = 80;

        const logBg = this.add.graphics();
        logBg.fillStyle(0x0e0b09, 0.85);
        logBg.fillRect(0, logY, W, logH);
        logBg.lineStyle(1, GOLD, 0.2);
        logBg.lineBetween(0, logY, W, logY);
        logBg.setDepth(4);

        this._logTexts = [];
        for (let i = 0; i < 3; i++) {
            const t = this.add.text(14, logY + 8 + i * 22, '', {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '12px',
                color: 'rgba(245,237,224,0.7)',
            }).setDepth(5);
            this._logTexts.push(t);
        }
    }

    _buildActionButtons(W, H) {
        const actions = [
            { label: '普通攻击', action: 'attack',  color: '#c9a84c' },
            { label: '技能',     action: 'skill',   color: '#5ab0e0' },
            { label: '道具',     action: 'item',    color: '#80cc60' },
            { label: '逃跑',     action: 'flee',    color: '#e07050' },
        ];

        const startY = H - HUD_H - 56;
        const btnW   = (W - 20) / 2;
        const btnH   = 40;

        this._actionBtns = [];
        actions.forEach((act, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const bx  = 10 + col * (btnW + 4);
            const by  = startY + row * (btnH + 4) - btnH - 4;

            const bg = this.add.graphics();
            bg.fillStyle(0x1a1614, 1);
            bg.fillRoundedRect(bx, by, btnW, btnH, 5);
            bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(act.color).color, 0.5);
            bg.strokeRoundedRect(bx, by, btnW, btnH, 5);
            bg.setDepth(5);

            const label = this.add.text(bx + btnW / 2, by + btnH / 2, act.label, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '14px',
                color: act.color,
            }).setOrigin(0.5).setDepth(6);

            const zone = this.add.zone(bx + btnW / 2, by + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
            zone.setDepth(7);
            zone.on('pointerdown', () => this._doAction(act.action));
            zone.on('pointerover', () => { bg.clear(); bg.fillStyle(0x2a2220, 1); bg.fillRoundedRect(bx, by, btnW, btnH, 5); });
            zone.on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a1614, 1); bg.fillRoundedRect(bx, by, btnW, btnH, 5); });

            this._actionBtns.push({ bg, label, zone, action: act.action });
        });
    }

    _doAction(action) {
        if (action === 'flee') {
            gameClient.send(CMD.BATTLE.cmd, CMD.BATTLE.flee, {});
            this.scene.stop('BattleScene');
            this.scene.start('ExploreScene');
            return;
        }
        gameClient.send(CMD.BATTLE.cmd, CMD.BATTLE.action, { action });
        this._addLog(`你使用了【${action === 'attack' ? '普通攻击' : action}】`);
        // 禁用按钮等待回复
        this._actionBtns.forEach(btn => btn.zone.setActive(false));
    }

    _onBattleAction(data) {
        if (!data) return;
        if (data.playerHP !== undefined) {
            this._playerHP = data.playerHP;
            this._updateHpBar(this._playerHpBar, this._playerHP / this._playerMaxHP);
            this._playerHpText.setText(`${this._playerHP} / ${this._playerMaxHP}`);
        }
        if (data.enemyHP !== undefined) {
            this._enemyHP = data.enemyHP;
            this._updateHpBar(this._enemyHpBar, this._enemyHP / this._enemyMaxHP);
            this._enemyHpText.setText(`${this._enemyHP} / ${this._enemyMaxHP}`);
        }
        if (data.log) this._addLog(data.log);
        if (data.result === 'win')  this._onWin();
        if (data.result === 'lose') this._onLose();
        // 恢复按钮
        this._actionBtns.forEach(btn => btn.zone.setActive(true));
    }

    _onBattleStart(data) {
        if (!data) return;
        if (data.enemyName) this._enemyName = data.enemyName;
        if (data.enemyMaxHP) {
            this._enemyMaxHP = data.enemyMaxHP;
            this._enemyHP    = data.enemyHP || data.enemyMaxHP;
        }
    }

    _addLog(text) {
        this._battleLog.push(text);
        const last3 = this._battleLog.slice(-3);
        this._logTexts.forEach((t, i) => t.setText(last3[i] || ''));
    }

    _onWin() {
        this.add.text(this.scale.width / 2, 200, '胜利！', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '36px',
            color: '#c9a84c',
        }).setOrigin(0.5);
        this.time.delayedCall(2000, () => this.scene.start('ExploreScene'));
    }

    _onLose() {
        this.add.text(this.scale.width / 2, 200, '落败...', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '36px',
            color: '#e05555',
        }).setOrigin(0.5);
        this.time.delayedCall(2000, () => this.scene.start('ExploreScene'));
    }

    update() {}

    shutdown() {
        gameClient.offAll(`${CMD.BATTLE.cmd}_${CMD.BATTLE.action}`);
        gameClient.offAll(`${CMD.BATTLE.cmd}_${CMD.BATTLE.start}`);
    }
}
