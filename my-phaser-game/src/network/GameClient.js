/**
 * GameClient.js - 游戏 HTTP REST 客户端
 * 连接 Spring Boot REST API: http://localhost:8090/api
 * 使用标准 JSON/fetch 通信，无需实现 ioGame 二进制协议
 */

// 自动跟随访问源的主机名，PC 用 localhost，手机用本机 IP 均可
const API_BASE = `${window.location.protocol}//${window.location.hostname}:8090/api`;

class GameClient {
    constructor() {
        this.userId = null;
        this.username = null;
        this._listeners = {};
        this._onceMap = {};
    }

    // ──────────────────────────────────────────────
    //  内部 fetch 封装
    // ──────────────────────────────────────────────
    async _post(path, body = {}) {
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });
            const json = await res.json();
            if (json.code !== 0) throw new Error(json.msg || '请求失败');
            return json.data;
        } catch (e) {
            console.error('[GameClient] POST error', path, e);
            throw e;
        }
    }

    async _get(path) {
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                credentials: 'include'
            });
            const json = await res.json();
            if (json.code !== 0) throw new Error(json.msg || '请求失败');
            return json.data;
        } catch (e) {
            console.error('[GameClient] GET error', path, e);
            throw e;
        }
    }

    // ──────────────────────────────────────────────
    //  认证
    // ──────────────────────────────────────────────
    async login(username, password) {
        const data = await this._post('/auth/login', { username, password });
        this.userId = data.userId;
        this.username = data.username;
        this._saveLocal();
        this._emit('__connected__', data);
        return data;
    }

    async register(username, password) {
        const data = await this._post('/auth/register', { username, password });
        this.userId = data.userId;
        this.username = data.username;
        this._saveLocal();
        return data;
    }

    async logout() {
        await this._post('/auth/logout');
        this.userId = null;
        this.username = null;
        localStorage.removeItem('qslh_userId');
        localStorage.removeItem('qslh_username');
    }

    async checkSession() {
        try {
            const data = await this._get('/auth/me');
            this.userId = data.userId;
            this.username = data.username;
            return true;
        } catch {
            return false;
        }
    }

    // ──────────────────────────────────────────────
    //  剧情对话
    // ──────────────────────────────────────────────
    async startDialogue(npcId, worldIndex = 1) {
        return this._post('/story/start', { npcId, worldIndex });
    }

    async sendChoice(sessionId, choiceId, npcId = '', worldIndex = 1) {
        return this._post('/story/choice', { sessionId, choiceId, npcId, worldIndex });
    }

    async sendFreeInput(sessionId, text, npcId = '', worldIndex = 1) {
        return this._post('/story/input', { sessionId, text, npcId, worldIndex });
    }

    async endDialogue(sessionId) {
        return this._post('/story/end', { sessionId });
    }

    async getNpcInfo(npcId) {
        return this._get(`/story/npc/${npcId}`);
    }

    // ──────────────────────────────────────────────
    //  缘分系统
    // ──────────────────────────────────────────────
    async getFateMap() {
        return this._get('/fate/map');
    }

    async getRelations() {
        return this._get('/fate/relations');
    }

    // ──────────────────────────────────────────────
    //  七世轮回
    // ──────────────────────────────────────────────
    async getRebirthStatus() {
        return this._get('/rebirth/status');
    }

    async selectBook(bookId, bookTitle) {
        return this._post('/rebirth/select-book', { bookId, bookTitle });
    }

    // ──────────────────────────────────────────────
    //  本地存储
    // ──────────────────────────────────────────────
    _saveLocal() {
        if (this.userId) localStorage.setItem('qslh_userId', this.userId);
        if (this.username) localStorage.setItem('qslh_username', this.username);
    }

    loadAuth() {
        this.userId = localStorage.getItem('qslh_userId');
        this.username = localStorage.getItem('qslh_username');
        return !!this.userId;
    }

    clearAuth() {
        this.userId = null;
        this.username = null;
        localStorage.removeItem('qslh_userId');
        localStorage.removeItem('qslh_username');
    }

    // ──────────────────────────────────────────────
    //  事件（兼容旧代码）
    // ──────────────────────────────────────────────
    on(eventName, callback) {
        const key = String(eventName);
        if (!this._listeners[key]) this._listeners[key] = [];
        this._listeners[key].push(callback);
    }

    once(eventName, callback) {
        const key = String(eventName);
        if (!this._onceMap[key]) this._onceMap[key] = [];
        this._onceMap[key].push(callback);
    }

    off(eventName, callback) {
        const key = String(eventName);
        if (this._listeners[key]) {
            this._listeners[key] = this._listeners[key].filter(cb => cb !== callback);
        }
    }

    _emit(eventName, data) {
        const key = String(eventName);
        (this._listeners[key] || []).forEach(cb => { try { cb(data); } catch (e) { } });
        const onceList = this._onceMap[key] || [];
        delete this._onceMap[key];
        onceList.forEach(cb => { try { cb(data); } catch (e) { } });
    }

    /** 兼容旧的 connect() 调用 */
    connect() {
        this.checkSession().then(ok => {
            if (ok) this._emit('__connected__', { userId: this.userId });
        });
    }
    disconnect() {}
    get connected() { return !!this.userId; }

    /** 向后兼容：WebSocket 时代的 send()，现已改为 REST，此处为空操作 */
    send(cmd, subCmd, data = {}) {
        console.debug('[GameClient] send() 已废弃，请使用 REST API', cmd, subCmd);
    }

    /** 向后兼容：移除某个 key 的所有监听 */
    offAll(eventName) {
        const key = String(eventName);
        delete this._listeners[key];
        delete this._onceMap[key];
    }
}

// 单例
const gameClient = new GameClient();
export default gameClient;

// ──────────────────────────────────────────────
//  CMD 常量表（保留兼容）
// ──────────────────────────────────────────────
export const CMD = {
    USER:       { cmd: 1,  login: 1, logout: 2, getInfo: 3 },
    STORY:      { cmd: 26, startDialogue: 1, sendChoice: 2, sendFreeInput: 3, endDialogue: 4 },
    EXPLORE:    { cmd: 21, getMap: 1, moveTo: 2, getPOI: 3 },
    BOOK_WORLD: { cmd: 23, listBooks: 1, getBook: 2, selectBook: 3 },
    CHARACTER:  { cmd: 11, getInfo: 1, equip: 2, unequip: 3 },
    ENCHANT:    { cmd: 12, getList: 1, enchant: 2 },
    SKILL:      { cmd: 13, getTree: 1, learn: 2, upgrade: 3 },
    BAG:        { cmd: 14, getItems: 1, useItem: 2, dropItem: 3 },
    PET:        { cmd: 15, getList: 1, feed: 2, release: 3, rename: 4 },
    MEMORY:     { cmd: 16, getList: 1, view: 2 },
    FATE:       { cmd: 25, getMap: 1, getNpcDetail: 2 },
    REBIRTH:    { cmd: 24, start: 1, confirm: 2 },
    BATTLE:     { cmd: 22, start: 1, action: 2, flee: 3 },
};
