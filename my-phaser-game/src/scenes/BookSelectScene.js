/**
 * BookSelectScene.js  P13 书籍选择
 * 网格书卡 + 搜索 + 选中效果 + 确认发送
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const HUD_H = 56;

const DEMO_BOOKS = [
    { id: 1,  name: '诛仙',       tag: '仙侠',   era: '太清时代', author: '萧鼎',   chapters: 712 },
    { id: 2,  name: '凡人修仙传', tag: '修真',   era: '凡界万年', author: '忘语',   chapters: 1657},
    { id: 3,  name: '斗破苍穹',   tag: '玄幻',   era: '大陆纪元', author: '天蚕土豆',chapters: 1648},
    { id: 4,  name: '完美世界',   tag: '洪荒',   era: '混沌之初', author: '辰东',   chapters: 1800},
    { id: 5,  name: '遮天',       tag: '太古',   era: '禁地时代', author: '辰东',   chapters: 1502},
    { id: 6,  name: '雪鹰领主',   tag: '领主',   era: '混沌纪元', author: '我吃西红柿', chapters: 998},
    { id: 7,  name: '大主宰',     tag: '玄幻',   era: '大千',     author: '天蚕土豆', chapters: 1524},
    { id: 8,  name: '武动乾坤',   tag: '玄幻',   era: '玄黄大陆', author: '天蚕土豆', chapters: 1316},
    { id: 9,  name: '天道图书馆', tag: '现代仙侠', era: '末法时代',author: '唐家三少', chapters: 2144},
    { id: 10, name: '归处',       tag: '归途',   era: '彼岸之地', author: '七世轮回', chapters: 7 },
];

export default class BookSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BookSelectScene' });
        this._allBooks     = DEMO_BOOKS;
        this._filteredBooks = DEMO_BOOKS;
        this._selectedBook  = null;
        this._worldIndex    = 1;
        this._cardObjs      = [];
    }

    preload() {}

    create(data) {
        if (data) this._worldIndex = data.worldIndex || 1;

        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W / 2, H / 2, W, H, INK);
        this._buildHeader(W);
        this._buildSearchArea();
        this._buildGrid(W, H);
        this._buildConfirmBtn(W, H);

        // 显示搜索框
        const searchArea = document.getElementById('book-search-area');
        if (searchArea) searchArea.style.display = 'block';

        const searchInput = document.getElementById('book-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.addEventListener('input', () => this._onSearch(searchInput.value));
        }

        // 请求服务端书单
        gameClient.send(CMD.BOOK_WORLD.cmd, CMD.BOOK_WORLD.listBooks, {});
        gameClient.on(`${CMD.BOOK_WORLD.cmd}_${CMD.BOOK_WORLD.listBooks}`, (d) => {
            if (d && d.books) {
                this._allBooks = d.books;
                this._filteredBooks = d.books;
                this._buildGrid(W, H);
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

        this.add.text(W / 2, 25, '选择书籍世界', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '17px',
            color: '#c9a84c',
        }).setOrigin(0.5).setDepth(6);

        const back = this.add.text(16, 25, '‹ 返回', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '13px',
            color: 'rgba(201,168,76,0.7)',
        }).setOrigin(0, 0.5).setDepth(6).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => {
            const searchArea = document.getElementById('book-search-area');
            if (searchArea) searchArea.style.display = 'none';
            this.scene.stop('BookSelectScene');
        });
    }

    _buildSearchArea() {
        // HTML 搜索框已在 index.html 中，通过 CSS 控制显示
        // 这里调整其位置到顶部栏下方
        const searchArea = document.getElementById('book-search-area');
        if (searchArea) {
            searchArea.style.top  = '54px';
            searchArea.style.left = '0';
            searchArea.style.width = '100%';
            searchArea.style.padding = '0 12px';
        }
    }

    _onSearch(query) {
        const q = query.trim().toLowerCase();
        this._filteredBooks = q
            ? this._allBooks.filter(b => b.name.toLowerCase().includes(q) || b.tag.toLowerCase().includes(q))
            : this._allBooks;
        this._buildGrid(this.scale.width, this.scale.height);
    }

    _buildGrid(W, H) {
        this._cardObjs.forEach(c => {
            c.bg.destroy();
            c.nameT.destroy();
            c.tagT.destroy();
            c.eraT.destroy();
            c.coverGfx.destroy();
            c.zone.destroy();
        });
        this._cardObjs = [];

        const cols   = 2;
        const cardW  = (W - 28) / 2;
        const cardH  = 110;
        const gap    = 8;
        const startY = 102; // 顶部栏 + 搜索框

        this._filteredBooks.forEach((book, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x   = 8 + col * (cardW + gap);
            const y   = startY + row * (cardH + gap);

            if (y + cardH > H - HUD_H - 50) return; // 超出显示区域跳过

            const card = this._buildCard(x, y, cardW, cardH, book);
            this._cardObjs.push(card);
        });
    }

    _buildCard(x, y, w, h, book) {
        const isSelected = this._selectedBook && this._selectedBook.id === book.id;

        const bg = this.add.graphics();
        bg.fillStyle(isSelected ? 0x2a2010 : 0x1a1610, 1);
        bg.fillRoundedRect(x, y, w, h, 6);
        bg.lineStyle(2, isSelected ? GOLD : 0x2a2218, isSelected ? 0.9 : 0.4);
        bg.strokeRoundedRect(x, y, w, h, 6);
        bg.setDepth(3);

        // 书籍封面占位
        const coverW = 60, coverH = h - 20;
        const coverGfx = this.add.graphics();
        coverGfx.fillStyle(isSelected ? 0x3a2e14 : 0x221e10, 1);
        coverGfx.fillRoundedRect(x + 8, y + 10, coverW, coverH, 3);
        coverGfx.lineStyle(1, GOLD, isSelected ? 0.5 : 0.2);
        coverGfx.strokeRoundedRect(x + 8, y + 10, coverW, coverH, 3);
        // 书名竖排效果
        coverGfx.setDepth(4);

        // 竖排书名（取前4字）
        const shortTitle = book.name.slice(0, 4);
        for (let ci = 0; ci < shortTitle.length; ci++) {
            this.add.text(x + 8 + coverW / 2, y + 10 + 10 + ci * 18, shortTitle[ci], {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '12px',
                color: isSelected ? '#c9a84c' : 'rgba(201,168,76,0.45)',
            }).setOrigin(0.5, 0).setDepth(5);
        }

        // 书名
        const nameT = this.add.text(x + 78, y + 12, book.name, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '14px',
            color: '#f5ede0',
        }).setDepth(5);

        // 标签
        const tagT = this.add.text(x + 78, y + 34, `【${book.tag}】`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: '#c9a84c',
        }).setDepth(5);

        // 时代
        const eraT = this.add.text(x + 78, y + 54, book.era, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '11px',
            color: 'rgba(245,237,224,0.5)',
        }).setDepth(5);

        // 章节数
        this.add.text(x + 78, y + 74, `共 ${book.chapters} 章`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '10px',
            color: 'rgba(245,237,224,0.35)',
        }).setDepth(5);

        // 选中标记
        if (isSelected) {
            this.add.text(x + w - 10, y + 10, '✓', {
                fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#c9a84c',
            }).setOrigin(1, 0).setDepth(6);
        }

        const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true }).setDepth(6);
        zone.on('pointerdown', () => {
            this._selectedBook = book;
            this._buildGrid(this.scale.width, this.scale.height);
        });

        return { bg, nameT, tagT, eraT, coverGfx, zone };
    }

    _buildConfirmBtn(W, H) {
        const btnY = H - HUD_H - 46;
        const btnW = W - 24;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x2a2010, 1);
        btnBg.fillRoundedRect(12, btnY, btnW, 38, 5);
        btnBg.lineStyle(1, GOLD, 0.6);
        btnBg.strokeRoundedRect(12, btnY, btnW, 38, 5);
        btnBg.setDepth(10);

        const btnLabel = this.add.text(W / 2, btnY + 19, '确认选择', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '15px', color: '#c9a84c',
        }).setOrigin(0.5).setDepth(11);

        const zone = this.add.zone(W / 2, btnY + 19, btnW, 38)
            .setInteractive({ useHandCursor: true }).setDepth(12);

        zone.on('pointerdown', () => {
            if (!this._selectedBook) {
                btnLabel.setText('请先选择一本书');
                this.time.delayedCall(1500, () => btnLabel.setText('确认选择'));
                return;
            }

            gameClient.send(CMD.BOOK_WORLD.cmd, CMD.BOOK_WORLD.selectBook, {
                worldIndex: this._worldIndex,
                bookId:     this._selectedBook.id,
            });

            // 跳转到轮回转场
            const searchArea = document.getElementById('book-search-area');
            if (searchArea) searchArea.style.display = 'none';

            this.scene.start('RebirthScene', {
                worldNum: this._worldIndex,
                bookName: this._selectedBook.name,
                bookEra:  this._selectedBook.era,
                bookId:   this._selectedBook.id,
            });
        });
    }

    update() {}

    shutdown() {
        const searchArea = document.getElementById('book-search-area');
        if (searchArea) searchArea.style.display = 'none';
        gameClient.offAll(`${CMD.BOOK_WORLD.cmd}_${CMD.BOOK_WORLD.listBooks}`);
    }
}
