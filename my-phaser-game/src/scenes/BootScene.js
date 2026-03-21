/**
 * BootScene.js
 * 启动 + 登录页
 */

import gameClient from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // ── 背景 ──
        this.add.rectangle(W / 2, H / 2, W, H, INK);

        // ── 装饰圆环 ──
        const gfx = this.add.graphics();
        gfx.lineStyle(1, GOLD, 0.12);
        gfx.strokeCircle(W / 2, H * 0.32, 130);
        gfx.lineStyle(1, GOLD, 0.07);
        gfx.strokeCircle(W / 2, H * 0.32, 155);

        // ── 标题 ──
        this.add.text(W / 2, H * 0.28, '七世轮回', {
            fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
            fontSize: '38px',
            color: '#c9a84c',
            stroke: '#6a4a1a',
            strokeThickness: 2,
        }).setOrigin(0.5);

        this.add.text(W / 2, H * 0.28 + 50, '— 七世情缘，轮回不尽 —', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: 'rgba(201,168,76,0.55)',
        }).setOrigin(0.5);

        // ── 错误提示 ──
        this._errText = this.add.text(W / 2, H * 0.58, '', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: '#e74c3c',
        }).setOrigin(0.5);

        // ── 登录按钮区域 ──
        this._buildLoginUI(W, H);

        // 隐藏 loading screen
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';

        // ── 底部版本号 ──
        this.add.text(W / 2, H - 14, 'v0.1.0  七世轮回', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '10px',
            color: 'rgba(201,168,76,0.2)',
        }).setOrigin(0.5);
    }

    _buildLoginUI(W, H) {
        // 复用页面已有的 HTML form（如果存在），否则用 Phaser DOMElement
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.style.display = 'block';
            const btnLogin  = document.getElementById('btn-login');
            const btnReg    = document.getElementById('btn-register');
            const inputUser = document.getElementById('input-username');
            const inputPass = document.getElementById('input-password');

            const doLogin = async () => {
                const username = inputUser?.value.trim() || '';
                const password = inputPass?.value.trim() || '';
                if (!username || !password) { this._showErr('请填写用户名和密码'); return; }
                this._showErr('');
                if (btnLogin) btnLogin.disabled = true;
                try {
                    await gameClient.login(username, password);
                    this._onLoginSuccess();
                } catch (e) {
                    this._showErr(e.message || '登录失败');
                } finally {
                    if (btnLogin) btnLogin.disabled = false;
                }
            };

            const doRegister = async () => {
                const username = inputUser?.value.trim() || '';
                const password = inputPass?.value.trim() || '';
                if (!username || !password) { this._showErr('请填写用户名和密码'); return; }
                this._showErr('');
                if (btnReg) btnReg.disabled = true;
                try {
                    await gameClient.register(username, password);
                    this._showErr('注册成功！正在登录...');
                    await gameClient.login(username, password);
                    this._onLoginSuccess();
                } catch (e) {
                    this._showErr(e.message || '注册失败');
                } finally {
                    if (btnReg) btnReg.disabled = false;
                }
            };

            if (btnLogin) btnLogin.addEventListener('click', doLogin);
            if (btnReg)   btnReg.addEventListener('click',   doRegister);
            if (inputPass) inputPass.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
            return;
        }

        // ── 无 HTML form 时，创建内嵌 DOM 表单 ──
        const formEl = document.createElement('div');
        formEl.innerHTML = `
          <style>
            #phaser-login { position:absolute; top:0; left:0; width:100%; height:100%;
              display:flex; flex-direction:column; align-items:center; justify-content:center;
              pointer-events:none; }
            #phaser-login input, #phaser-login button {
              pointer-events:auto; width:220px; margin:4px 0; padding:8px 12px;
              border-radius:4px; border:1px solid #c9a84c; background:#1a1512;
              color:#e8d5a3; font-size:14px; font-family:'Microsoft YaHei',sans-serif; }
            #phaser-login button { background:#c9a84c; color:#1a1512; cursor:pointer; font-weight:bold; }
            #phaser-login button:hover { background:#e8d5a3; }
            #phaser-login .btn-row { display:flex; gap:8px; }
          </style>
          <div id="phaser-login" style="top:${H*0.45}px">
            <input id="pi-user" type="text" placeholder="用户名" />
            <input id="pi-pass" type="password" placeholder="密码" />
            <div class="btn-row">
              <button id="pi-login">登 录</button>
              <button id="pi-reg">注 册</button>
            </div>
          </div>`;
        document.getElementById('game-container')?.appendChild(formEl) ||
            document.body.appendChild(formEl);

        const doLogin = async () => {
            const u = document.getElementById('pi-user')?.value.trim() || '';
            const p = document.getElementById('pi-pass')?.value.trim() || '';
            if (!u || !p) { this._showErr('请填写用户名和密码'); return; }
            try {
                await gameClient.login(u, p);
                formEl.remove();
                this._onLoginSuccess();
            } catch (e) { this._showErr(e.message || '登录失败'); }
        };

        document.getElementById('pi-login')?.addEventListener('click', doLogin);
        document.getElementById('pi-reg')?.addEventListener('click', async () => {
            const u = document.getElementById('pi-user')?.value.trim() || '';
            const p = document.getElementById('pi-pass')?.value.trim() || '';
            if (!u || !p) { this._showErr('请填写用户名和密码'); return; }
            try {
                await gameClient.register(u, p);
                await gameClient.login(u, p);
                formEl.remove();
                this._onLoginSuccess();
            } catch (e) { this._showErr(e.message || '注册失败'); }
        });
        document.getElementById('pi-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    }

    _showErr(msg) {
        if (this._errText) this._errText.setText(msg);
        const el = document.getElementById('login-error');
        if (el) el.textContent = msg;
    }

    _onLoginSuccess() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.style.display = 'none';
        this.scene.start('ExploreScene');
        this.scene.launch('HudScene');
    }
}
