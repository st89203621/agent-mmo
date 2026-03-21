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
// 设备像素比（iPhone = 3, 普通安卓 = 2），限制最大 3 倍避免内存过高
const DPR = Math.min(window.devicePixelRatio || 1, 3);

const config = {
    type: Phaser.AUTO,
    width:  390,
    height: 680,
    backgroundColor: '#0e0b09',
    parent: 'game-container',
    // resolution 让 Text 纹理按 DPR 生成，是移动端文字清晰的关键
    resolution: DPR,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:  390,
        height: 680,
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
        antialias: true,
        pixelArt: false,
        roundPixels: true,    // 文字/图形对齐像素，减少亚像素模糊
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
