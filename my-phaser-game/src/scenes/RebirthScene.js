/**
 * RebirthScene.js  P05 轮回转场
 * 全屏黑色 + 旋转圆环 + 轮回诗句逐行淡入
 */

import gameClient, { CMD } from '../network/GameClient.js';

const INK  = 0x0e0b09;
const GOLD = 0xc9a84c;
const PAPER= 0xf5ede0;

const BOOKS = [
    { id: 1, name: '诛仙', era: '仙侠·太清' },
    { id: 2, name: '凡人修仙传', era: '修真·凡界' },
    { id: 3, name: '斗破苍穹', era: '武道·大陆' },
    { id: 4, name: '完美世界', era: '混沌·洪荒' },
    { id: 5, name: '遮天',     era: '禁地·太古' },
    { id: 6, name: '雪鹰领主', era: '领主·混沌' },
    { id: 7, name: '归处',     era: '归途·彼岸' },
];

const REBIRTH_POEMS = [
    '七世轮回，情债难偿，',
    '一世结缘，来世再续，',
    '生死之间，唯情不变，',
    '踏入此世，续写因缘。',
];

export default class RebirthScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RebirthScene' });
        this._worldNum   = 1;
        this._bookName   = '诛仙';
        this._bookEra    = '仙侠·太清';
        this._bookId     = 1;
        this._rings      = [];
        this._poemTexts  = [];
        this._selectedBookId  = 1;
        this._bookSelectorObjs = [];  // 书籍标签对象列表，用于重建时清理
    }

    preload() {}

    create(data) {
        if (data) {
            this._worldNum  = data.worldNum  || 1;
            this._bookName  = data.bookName  || this._bookName;
            this._bookEra   = data.bookEra   || this._bookEra;
            this._bookId    = data.bookId    || 1;
            this._selectedBookId = this._bookId;
        }

        const W = this.scale.width;
        const H = this.scale.height;

        // 纯黑背景
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

        // 旋转圆环
        this._buildRings(W, H);

        // 第 N 世 标题
        this._buildTitle(W, H);

        // 书名和时代
        this._buildBookInfo(W, H);

        // 轮回诗句（逐行淡入）
        this._buildPoems(W, H);

        // 书籍快选
        this._buildBookSelector(W, H);

        // 踏入此世按钮
        this._buildEnterBtn(W, H);
    }

    _buildRings(W, H) {
        const cx = W / 2;
        const cy = H * 0.38;
        const radii = [70, 110, 150];
        const alphas = [0.6, 0.4, 0.25];

        this._ringGraphics = this.add.graphics();
        this._ringGraphics.setDepth(2);
        this._ringData = { cx, cy, radii, alphas, angles: [0, 0, 0] };

        this._drawRings();
    }

    _drawRings() {
        const g = this._ringGraphics;
        g.clear();
        const { cx, cy, radii, alphas, angles } = this._ringData;

        radii.forEach((r, i) => {
            const a = angles[i];
            g.lineStyle(i === 0 ? 2 : 1, GOLD, alphas[i]);
            g.strokeCircle(cx, cy, r);

            // 圆环上的刻度点
            for (let tick = 0; tick < 12; tick++) {
                const angle = a + (tick / 12) * Math.PI * 2;
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                g.fillStyle(GOLD, alphas[i] * 1.5);
                g.fillCircle(px, py, i === 0 ? 2.5 : 1.5);
            }

            // 连接线（模拟八卦纹路）
            if (i === 0) {
                g.lineStyle(1, GOLD, 0.2);
                for (let seg = 0; seg < 8; seg++) {
                    const angle = a + (seg / 8) * Math.PI * 2;
                    g.lineBetween(cx, cy, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
                }
            }
        });

        // 中心金点
        g.fillStyle(GOLD, 0.9);
        g.fillCircle(cx, cy, 5);
    }

    _buildTitle(W, H) {
        const cy = H * 0.38;
        this._worldText = this.add.text(W / 2, cy, `第 ${this._worldNum} 世`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '32px',
            color: '#c9a84c',
            stroke: '#3a2010',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(5);
    }

    _buildBookInfo(W, H) {
        const infoY = H * 0.38 + 50;
        this._bookNameText = this.add.text(W / 2, infoY, this._bookName, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '16px',
            color: '#f5ede0',
        }).setOrigin(0.5).setDepth(5);

        this._bookEraText = this.add.text(W / 2, infoY + 24, this._bookEra, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: 'rgba(201,168,76,0.6)',
        }).setOrigin(0.5).setDepth(5);
    }

    _buildPoems(W, H) {
        const startY = H * 0.38 + 100;
        this._poemTexts = [];

        REBIRTH_POEMS.forEach((line, i) => {
            const t = this.add.text(W / 2, startY + i * 28, line, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '14px',
                color: 'rgba(245,237,224,0.9)',
            }).setOrigin(0.5).setDepth(5).setAlpha(0);

            this._poemTexts.push(t);

            // 逐行延迟淡入
            this.tweens.add({
                targets: t,
                alpha: 1,
                duration: 800,
                delay: 600 + i * 500,
                ease: 'Sine.easeIn',
            });
        });
    }

    _buildBookSelector(W, H) {
        // 清理旧标签对象
        this._bookSelectorObjs.forEach(o => o.destroy && o.destroy());
        this._bookSelectorObjs = [];

        const selectorY = H - 160;
        const titleT = this.add.text(W / 2, selectorY, '— 选择书籍世界 —', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: 'rgba(201,168,76,0.5)',
        }).setOrigin(0.5).setDepth(5);
        this._bookSelectorObjs.push(titleT);

        // 横向滚动标签
        const tagY = selectorY + 24;
        const tagH = 28;
        let offsetX = 12;

        BOOKS.forEach(book => {
            const isSelected = book.id === this._selectedBookId;
            const tagW = book.name.length * 14 + 20;

            const tagBg = this.add.graphics();
            tagBg.fillStyle(isSelected ? 0x2a2010 : 0x1a1610, 1);
            tagBg.fillRoundedRect(offsetX, tagY, tagW, tagH, 14);
            tagBg.lineStyle(1, GOLD, isSelected ? 0.8 : 0.3);
            tagBg.strokeRoundedRect(offsetX, tagY, tagW, tagH, 14);
            tagBg.setDepth(5);

            const tagText = this.add.text(offsetX + tagW / 2, tagY + tagH / 2, book.name, {
                fontFamily: '"Microsoft YaHei", sans-serif',
                fontSize: '12px',
                color: isSelected ? '#c9a84c' : 'rgba(245,237,224,0.5)',
            }).setOrigin(0.5).setDepth(6);

            const zone = this.add.zone(offsetX + tagW / 2, tagY + tagH / 2, tagW, tagH)
                .setInteractive({ useHandCursor: true })
                .setDepth(7);

            zone.on('pointerdown', () => {
                this._selectedBookId = book.id;
                this._bookName = book.name;
                this._bookEra  = book.era;
                this._bookNameText.setText(book.name);
                this._bookEraText.setText(book.era);
                this._buildBookSelector(W, H);
            });

            this._bookSelectorObjs.push(tagBg, tagText, zone);
            offsetX += tagW + 8;
        });
    }

    _buildEnterBtn(W, H) {
        const btnY = H - 90;
        const btnW = 180;
        const btnH = 44;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x2a2010, 1);
        btnBg.fillRoundedRect(W / 2 - btnW / 2, btnY, btnW, btnH, 22);
        btnBg.lineStyle(2, GOLD, 0.8);
        btnBg.strokeRoundedRect(W / 2 - btnW / 2, btnY, btnW, btnH, 22);
        btnBg.setDepth(5);

        const btnText = this.add.text(W / 2, btnY + btnH / 2, '踏入此世', {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '17px',
            color: '#c9a84c',
            letterSpacing: 4,
        }).setOrigin(0.5).setDepth(6);

        const zone = this.add.zone(W / 2, btnY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true })
            .setDepth(7);

        zone.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x3a3018, 1);
            btnBg.fillRoundedRect(W / 2 - btnW / 2, btnY, btnW, btnH, 22);
            btnBg.lineStyle(2, 0xffe88a, 1);
            btnBg.strokeRoundedRect(W / 2 - btnW / 2, btnY, btnW, btnH, 22);
        });

        zone.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x2a2010, 1);
            btnBg.fillRoundedRect(W / 2 - btnW / 2, btnY, btnW, btnH, 22);
            btnBg.lineStyle(2, GOLD, 0.8);
            btnBg.strokeRoundedRect(W / 2 - btnW / 2, btnY, btnW, btnH, 22);
        });

        zone.on('pointerdown', () => {
            // 通知服务端选书（fire-and-forget）
            gameClient.selectBook(
                String(this._selectedBookId), this._bookName
            ).catch(() => {});

            // 切换到探索场景
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('ExploreScene');
            });
        });
    }

    update() {
        if (!this._ringData) return;
        this._ringData.angles[0] += 0.003;
        this._ringData.angles[1] -= 0.0018;
        this._ringData.angles[2] += 0.001;
        this._drawRings();
    }
}
