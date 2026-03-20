/**
 * DialogueBox.js
 * Phaser3 对话框组件（带打字机效果）
 */

export const INK   = 0x0e0b09;
export const GOLD  = 0xc9a84c;
export const PAPER = 0xf5ede0;
export const RED   = 0x8b2a2a;

export default class DialogueBox {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    constructor(scene, x, y, width, height) {
        this.scene  = scene;
        this.x      = x;
        this.y      = y;
        this.width  = width;
        this.height = height;

        this._fullText  = '';
        this._displayed = '';
        this._typingTimer = null;
        this._charIndex  = 0;
        this._onComplete = null;
        this._typing     = false;

        this._buildUI();
    }

    _buildUI() {
        const s = this.scene;

        // 背景
        this.bg = s.add.graphics();
        this.bg.fillStyle(0x1a1410, 0.92);
        this.bg.fillRoundedRect(this.x, this.y, this.width, this.height, 8);
        this.bg.lineStyle(1, GOLD, 0.5);
        this.bg.strokeRoundedRect(this.x, this.y, this.width, this.height, 8);

        // 文字
        this.textObj = s.add.text(this.x + 14, this.y + 12, '', {
            fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
            fontSize: '14px',
            color: '#f5ede0',
            wordWrap: { width: this.width - 28, useAdvancedWrap: true },
            lineSpacing: 4,
        });
        this.textObj.setDepth(5);
        this.bg.setDepth(4);

        // 完成指示符（▼）
        this.indicator = s.add.text(
            this.x + this.width - 20,
            this.y + this.height - 20,
            '▼',
            { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: '#c9a84c' }
        );
        this.indicator.setDepth(5);
        this.indicator.setAlpha(0);

        // 闪烁动画
        s.tweens.add({
            targets: this.indicator,
            alpha: { from: 0, to: 1 },
            duration: 600,
            yoyo: true,
            repeat: -1,
        });
    }

    /**
     * 显示文字（打字机效果）
     * @param {string} text
     * @param {function} [onComplete]
     */
    typeText(text, onComplete) {
        this._stopTyping();
        this._fullText  = text;
        this._displayed = '';
        this._charIndex = 0;
        this._onComplete = onComplete || null;
        this._typing = true;
        this.indicator.setAlpha(0);
        this._typeNext();
    }

    _typeNext() {
        if (!this._typing) return;
        if (this._charIndex >= this._fullText.length) {
            this._typing = false;
            this.indicator.setAlpha(1);
            if (this._onComplete) this._onComplete();
            return;
        }
        this._displayed += this._fullText[this._charIndex];
        this._charIndex++;
        this.textObj.setText(this._displayed);
        this._typingTimer = this.scene.time.delayedCall(40, this._typeNext, [], this);
    }

    /**
     * 立即显示全部文字（跳过打字机）
     */
    skipTyping() {
        this._stopTyping();
        this._displayed = this._fullText;
        this.textObj.setText(this._displayed);
        this.indicator.setAlpha(1);
        if (this._onComplete) {
            this._onComplete();
            this._onComplete = null;
        }
    }

    setText(text) {
        this._stopTyping();
        this._fullText  = text;
        this._displayed = text;
        this.textObj.setText(text);
        this.indicator.setAlpha(1);
    }

    _stopTyping() {
        this._typing = false;
        if (this._typingTimer) {
            this._typingTimer.remove();
            this._typingTimer = null;
        }
    }

    isTyping() { return this._typing; }

    setVisible(v) {
        this.bg.setVisible(v);
        this.textObj.setVisible(v);
        this.indicator.setVisible(v);
    }

    destroy() {
        this._stopTyping();
        this.bg.destroy();
        this.textObj.destroy();
        this.indicator.destroy();
    }
}
