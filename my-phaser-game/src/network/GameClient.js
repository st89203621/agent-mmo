/**
 * GameClient.js - WebSocket 单例客户端
 * 连接 ioGame 后端 ws://localhost:8081
 * 使用 JSON 消息格式（后续可切换二进制协议）
 */

class GameClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.userId = null;
        this.token = null;
        this._listeners = {};   // { eventKey: [callbacks] }
        this._onceMap = {};     // { eventKey: [callbacks] }
        this._reconnectTimer = null;
        this._url = 'ws://localhost:8081';
        this._manualClose = false;
    }

    // ──────────────────────────────────────────────
    //  连接管理
    // ──────────────────────────────────────────────
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        this._manualClose = false;
        console.log('[GameClient] 正在连接', this._url);
        try {
            this.ws = new WebSocket(this._url);
            this.ws.onopen    = this._onOpen.bind(this);
            this.ws.onmessage = this._onMessage.bind(this);
            this.ws.onerror   = this._onError.bind(this);
            this.ws.onclose   = this._onClose.bind(this);
        } catch (e) {
            console.error('[GameClient] WebSocket 创建失败', e);
            this._scheduleReconnect();
        }
    }

    disconnect() {
        this._manualClose = true;
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }

    _onOpen() {
        this.connected = true;
        console.log('[GameClient] 已连接');
        this._emit('__connected__', {});
    }

    _onMessage(event) {
        try {
            const msg = JSON.parse(event.data);
            const key = `${msg.cmd}_${msg.subCmd}`;
            console.log('[GameClient] 收到消息', key, msg.data);
            this._emit(key, msg.data);
            this._emit('__any__', msg);
        } catch (e) {
            console.warn('[GameClient] 消息解析失败', event.data, e);
        }
    }

    _onError(e) {
        console.error('[GameClient] 连接错误', e);
        this._emit('__error__', e);
    }

    _onClose(e) {
        this.connected = false;
        console.warn('[GameClient] 连接关闭', e.code, e.reason);
        this._emit('__disconnected__', { code: e.code, reason: e.reason });
        if (!this._manualClose) {
            this._scheduleReconnect();
        }
    }

    _scheduleReconnect() {
        if (this._reconnectTimer) return;
        console.log('[GameClient] 3秒后重连...');
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            this.connect();
        }, 3000);
    }

    // ──────────────────────────────────────────────
    //  发送消息
    // ──────────────────────────────────────────────
    /**
     * @param {number} cmd
     * @param {number} subCmd
     * @param {object} data
     */
    send(cmd, subCmd, data = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[GameClient] 未连接，无法发送', cmd, subCmd);
            return false;
        }
        const payload = JSON.stringify({ cmd, subCmd, data });
        console.log('[GameClient] 发送', cmd, subCmd, data);
        this.ws.send(payload);
        return true;
    }

    // ──────────────────────────────────────────────
    //  事件监听
    // ──────────────────────────────────────────────
    /**
     * 监听 cmd_subCmd 事件
     * @param {string|number} eventName  可以是 "26_1" 或 "cmd_subcmd"
     * @param {function} callback
     */
    on(eventName, callback) {
        const key = String(eventName);
        if (!this._listeners[key]) this._listeners[key] = [];
        this._listeners[key].push(callback);
    }

    /**
     * 监听一次性事件
     */
    once(eventName, callback) {
        const key = String(eventName);
        if (!this._onceMap[key]) this._onceMap[key] = [];
        this._onceMap[key].push(callback);
    }

    /**
     * 移除监听
     */
    off(eventName, callback) {
        const key = String(eventName);
        if (this._listeners[key]) {
            this._listeners[key] = this._listeners[key].filter(cb => cb !== callback);
        }
        if (this._onceMap[key]) {
            this._onceMap[key] = this._onceMap[key].filter(cb => cb !== callback);
        }
    }

    /**
     * 移除某个key的所有监听
     */
    offAll(eventName) {
        const key = String(eventName);
        delete this._listeners[key];
        delete this._onceMap[key];
    }

    _emit(eventName, data) {
        const key = String(eventName);
        const listeners = this._listeners[key] || [];
        listeners.forEach(cb => {
            try { cb(data); } catch (e) { console.error('[GameClient] listener error', e); }
        });
        const onceList = this._onceMap[key] || [];
        delete this._onceMap[key];
        onceList.forEach(cb => {
            try { cb(data); } catch (e) { console.error('[GameClient] once error', e); }
        });
    }

    // ──────────────────────────────────────────────
    //  便捷方法
    // ──────────────────────────────────────────────
    saveAuth(userId, token) {
        this.userId = userId;
        this.token = token;
        if (userId) localStorage.setItem('qslh_userId', userId);
        if (token) localStorage.setItem('qslh_token', token);
    }

    loadAuth() {
        this.userId = localStorage.getItem('qslh_userId');
        this.token  = localStorage.getItem('qslh_token');
        return !!(this.userId && this.token);
    }

    clearAuth() {
        this.userId = null;
        this.token  = null;
        localStorage.removeItem('qslh_userId');
        localStorage.removeItem('qslh_token');
    }
}

// 单例
const gameClient = new GameClient();
export default gameClient;

// ──────────────────────────────────────────────
//  CMD 常量表
// ──────────────────────────────────────────────
export const CMD = {
    // 用户/登录
    USER: { cmd: 1,  login: 1, logout: 2, getInfo: 3 },
    // 剧情
    STORY: { cmd: 26, startDialogue: 1, sendChoice: 2, sendFreeInput: 3, endDialogue: 4 },
    // 探索
    EXPLORE: { cmd: 21, getMap: 1, moveTo: 2, getPOI: 3 },
    // 书籍世界
    BOOK_WORLD: { cmd: 23, listBooks: 1, getBook: 2, selectBook: 3 },
    // 人物装备
    CHARACTER: { cmd: 11, getInfo: 1, equip: 2, unequip: 3 },
    // 附魔
    ENCHANT: { cmd: 12, getList: 1, enchant: 2 },
    // 技能树
    SKILL: { cmd: 13, getTree: 1, learn: 2, upgrade: 3 },
    // 背包
    BAG: { cmd: 14, getItems: 1, useItem: 2, dropItem: 3 },
    // 宠物
    PET: { cmd: 15, getList: 1, feed: 2, release: 3, rename: 4 },
    // 记忆碎片
    MEMORY: { cmd: 16, getList: 1, view: 2 },
    // 因缘谱
    FATE: { cmd: 17, getMap: 1, getNpcDetail: 2 },
    // 轮回
    REBIRTH: { cmd: 18, start: 1, confirm: 2 },
    // 战斗
    BATTLE: { cmd: 22, start: 1, action: 2, flee: 3 },
};
