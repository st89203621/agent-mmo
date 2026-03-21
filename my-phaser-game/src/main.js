/**
 * main.js
 * Phaser 3 配置入口 + 所有场景注册
 * 七世轮回 前端
 */

import BootScene       from './scenes/BootScene.js';
import StoryScene      from './scenes/StoryScene.js';
import BattleScene     from './scenes/BattleScene.js';
import ExploreScene    from './scenes/ExploreScene.js';
import MemoryScene     from './scenes/MemoryScene.js';
import RebirthScene    from './scenes/RebirthScene.js';
import CharacterScene  from './scenes/CharacterScene.js';
import EnchantScene    from './scenes/EnchantScene.js';
import SkillScene      from './scenes/SkillScene.js';
import BagScene        from './scenes/BagScene.js';
import PetScene        from './scenes/PetScene.js';
import BookSelectScene from './scenes/BookSelectScene.js';
import FateMapScene    from './scenes/FateMapScene.js';
import HudScene        from './scenes/HudScene.js';

// ──────────────────────────────────────────────
//  Phaser 3 配置
// ──────────────────────────────────────────────
// 设备像素比取整（非整数 DPR 会造成 CSS 亚像素缩放导致模糊），限制最大 3 倍
const DPR = Math.min(Math.round(window.devicePixelRatio || 1), 3);

const config = {
    // Canvas2D 渲染器：文字由浏览器原生字体引擎直接输出到 canvas，
    // 完全绕开 WebGL 纹理采样，中文字体清晰度最高
    type: Phaser.CANVAS,
    width:  390,
    height: 680,
    backgroundColor: '#0e0b09',
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:  390,
        height: 680,
        // zoom 让 canvas 物理像素 = 390*DPR × 680*DPR
        // Scale.FIT 把 CSS 尺寸缩回屏幕，实现 1:1 物理像素映射
        zoom: DPR,
    },
    scene: [
        BootScene,
        // 主场景（只运行其一）
        ExploreScene,
        StoryScene,
        BattleScene,
        MemoryScene,
        RebirthScene,
        CharacterScene,
        EnchantScene,
        SkillScene,
        BagScene,
        PetScene,
        BookSelectScene,
        FateMapScene,
        // 常驻 HUD（最后注册，z-order 最高）
        HudScene,
    ],
    dom: {
        createContainer: true,
    },
    render: {
        antialias: false,     // Canvas2D 模式下关闭 antialias，文字边缘更锐利
        pixelArt: false,
        roundPixels: true,    // 文字/图形对齐像素，消除亚像素偏移
    },
    fps: {
        target: 60,
        forceSetTimeOut: false,
    },
};

// ──────────────────────────────────────────────
//  启动游戏
// ──────────────────────────────────────────────
const game = new Phaser.Game(config);

// 游戏实例挂载到 window 方便调试
window.__QSLH_GAME__ = game;

// ──────────────────────────────────────────────
//  全局键盘快捷键（开发用）
// ──────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey) return;
    const sm = game.scene;
    switch (e.key) {
        case '1': sm.stop('ExploreScene'); sm.start('ExploreScene');   break;
        case '2': sm.stop('StoryScene');   sm.start('StoryScene', { npcId: 'npc_debug', worldIndex: 1, npcName: '测试NPC', bookTag: '调试·人间' }); break;
        case '3': sm.stop('CharacterScene'); sm.start('CharacterScene'); break;
        case '4': sm.stop('BagScene');      sm.start('BagScene');        break;
        case '5': sm.stop('FateMapScene');  sm.start('FateMapScene');    break;
        case '6': sm.stop('RebirthScene');  sm.start('RebirthScene', { worldNum: 1 }); break;
        case '7': sm.stop('BookSelectScene'); sm.start('BookSelectScene'); break;
    }
});

export default game;
