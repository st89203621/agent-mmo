/**
 * BootScene.js
 * 启动 + 登录页
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const PAPER= 0xf5ede0;

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // 无需加载资源，纯 Graphics 绘制
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // ── 背景 ──
        this.add.rectangle(W / 2, H / 2, W, H, INK);

        // ── 装饰圆环 ──
        const gfx = this.add.graphics();
        gfx.lineStyle(1, GOLD, 0.12);
        gfx.strokeCircle(W / 2, H * 0.35, 130);
        gfx.lineStyle(1, GOLD, 0.07);
        gfx.strokeCircle(W / 2, H * 0.35, 155);

        // ── 标题 ──
        this.add.text(W / 2, H * 0.32, '七世轮回', {
            fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
            fontSize: '38px',
            color: '#c9a84c',
            stroke: '#6a4a1a',
            strokeThickness: 2,
        }).setOrigin(0.5);

        this.add.text(W / 2, H * 0.32 + 50, '— 七世情缘，轮回不尽 —', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: 'rgba(201,168,76,0.55)',
        }).setOrigin(0.5);

        // ── 显示 HTML 登录表单 ──
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.style.display = 'block';
            // 定位到画布相对位置
            loginForm.style.marginTop = '30px';
        }

        // 隐藏 loading screen
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';

        // ── 连接 WebSocket ──
        gameClient.connect();

        // ── 绑定登录按钮 ──
        const btnLogin  = document.getElementById('btn-login');
        const inputUser = document.getElementById('input-username');
        const inputPass = document.getElementById('input-password');
        const errDiv    = document.getElementById('login-error');

        const doLogin = () => {
            const username = inputUser ? inputUser.value.trim() : '';
            const password = inputPass ? inputPass.value.trim() : '';
            if (!username || !password) {
                if (errDiv) errDiv.textContent = '请填写用户名和密码';
                return;
            }
            if (errDiv) errDiv.textContent = '';
            if (btnLogin) btnLogin.disabled = true;

            // 发送登录消息
            if (gameClient.connected) {
                gameClient.send(CMD.USER.cmd, CMD.USER.login, { username, password });
            } else {
                // 等待连接后再发送
                gameClient.once('__connected__', () => {
                    gameClient.send(CMD.USER.cmd, CMD.USER.login, { username, password });
                });
                if (!gameClient.ws) gameClient.connect();
            }
        };

        if (btnLogin) {
            btnLogin.addEventListener('click', doLogin);
        }
        if (inputPass) {
            inputPass.addEventListener('keydown', e => {
                if (e.key === 'Enter') doLogin();
            });
        }

        // ── 监听登录响应 ──
        const loginKey = `${CMD.USER.cmd}_${CMD.USER.login}`;
        gameClient.on(loginKey, (data) => {
            if (btnLogin) btnLogin.disabled = false;
            if (data && data.code === 0) {
                // 登录成功
                gameClient.saveAuth(data.userId, data.token);
                this._onLoginSuccess();
            } else {
                const msg = (data && data.msg) ? data.msg : '登录失败，请重试';
                if (errDiv) errDiv.textContent = msg;
            }
        });

        // ── 连接错误提示 ──
        gameClient.on('__error__', () => {
            if (errDiv && !gameClient.connected) {
                errDiv.textContent = '服务器连接失败，正在重试...';
            }
        });

        // ── 开发模式：连接失败时仍可进入游戏 ──
        this._devBtn = this.add.text(W / 2, H - 30, '[ 开发模式进入 ]', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: 'rgba(201,168,76,0.35)',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this._devBtn.on('pointerdown', () => {
            gameClient.saveAuth('dev_user', 'dev_token');
            this._onLoginSuccess();
        });
        this._devBtn.on('pointerover', () => this._devBtn.setColor('rgba(201,168,76,0.7)'));
        this._devBtn.on('pointerout',  () => this._devBtn.setColor('rgba(201,168,76,0.35)'));

        // ── 底部版本号 ──
        this.add.text(W / 2, H - 14, 'v0.1.0  七世轮回', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '10px',
            color: 'rgba(201,168,76,0.2)',
        }).setOrigin(0.5);
    }

    _onLoginSuccess() {
        // 隐藏登录表单
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.style.display = 'none';

        // 切换到探索场景，同时启动 HUD
        this.scene.start('ExploreScene');
        this.scene.launch('HudScene');
    }

    update() {
        // BootScene 无需逐帧更新
    }
}
