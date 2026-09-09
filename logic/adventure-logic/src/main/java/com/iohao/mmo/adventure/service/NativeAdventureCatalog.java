package com.iohao.mmo.adventure.service;

final class NativeAdventureCatalog {
    static final String[] REALMS = {"樱花 · 相逢小镇", "枫林 · 晚照山谷", "大海 · 晴岚海岸", "机战 · 天枢基地", "三国 · 赤壁城寨", "龙珠 · 云海武道场", "花溪 · 花谷秋海"};
    static final int[] LEVELS = {1, 1, 3, 8, 15, 25, 1};
    static final String[] BOSSES = {"", "绯伞花王", "沧潮之主", "天枢重装", "赤壁战将", "云海炎龙", "秋海花灵"};
    static final String[] MONSTERS = {"林间小妖", "枫叶精灵", "迷途山灵", "苔衣守卫"};
    static final String[] MEMORIES = {"樱花书签", "风中信笺", "相逢约定", "红枫叶", "林间回声", "晚霞札记", "珍珠贝壳", "远方来信", "潮汐歌谣", "星轨残页", "回响芯片", "黎明信标", "江上灯火", "故人佩玉", "东风旧信", "云间铃音", "流星许愿", "长空誓言", "花溪拾梦", "秋海来信", "重逢花笺"};
    static final String[] TITLES = {"花与海的约定", "枫林晚照", "潮汐来信", "星光重启", "江海故人", "云上心愿", "花溪重逢"};
    static final String[] STORIES = {"情花将一枚樱花书签交给你，请你找回沿途三份回忆。", "枫叶停在未寄出的信上，山谷的守护者等待一场告别。", "海风带来远方来信，你沿晴岚海岸寻找潮汐的歌声。", "天枢基地的最后一盏灯仍然亮着，失去方向的机甲守着回乡航线。", "江上灯火年年如约，赤壁故人托你守住一封平安家书。", "流星掠过云海武道场，守护炎龙愿为勇者点亮归途。", "当七界的回忆汇成花溪，你终于读懂秋海来信中的重逢约定。"};
    static final String[][] MAP_NAMES = {
            {"花溪小镇", "落樱长堤", "蝶梦深谷"}, {"枫桥驿站", "红叶山径", "晚霞湖畔"},
            {"贝风渔港", "白沙浅湾", "星潮海岬"}, {"天枢基地"}, {"赤壁城寨"},
            {"云上花台", "霁月竹林", "流星天池"}, {"芙蓉渡口", "灯影水巷", "秋水镜湖"}
    };
    static final String[][] JOURNEYS = {
            {"花与海的约定", "寄往春天的信", "循着花香入梦"}, {"留住一片晚霞", "山风中的回音", "把秋天赠予你"},
            {"来自远方的帆", "海浪写下的诗", "等一场星海潮汐"}, {"失落的星核"}, {"渡江的烽火"},
            {"云端重逢", "一叶知清风", "许愿的人与流星"}, {"花溪再会", "灯火为谁而明", "相逢终有归处"}
    };
    static final String[][] SUBMAP_BOSSES = {
            {"", "樱堤守梦人", "蝶梦花灵"}, {"绯伞花王", "千枫山君", "晚霞湖灵"},
            {"沧潮之主", "白沙守望者", "星潮巨灵"}, {"天枢重装"}, {"赤壁战将"},
            {"云海炎龙", "霁月竹仙", "流星天龙"}, {"秋海花灵", "千灯河灵", "镜湖双月灵"}
    };

    static boolean validRealm(int realm) { return realm >= 0 && realm < REALMS.length; }
    static boolean extended(int realm) { return realm >= 3 && realm <= 5; }
    static float width(int realm) { return realm == 3 ? 35 : realm == 4 ? 40 : realm == 5 ? 42 : 32; }
    static float maxZ(int realm) { return extended(realm) ? 128 : 115; }
    static float enemyX(int slot) { return new float[] {-3, 4, -4, 4, 0}[slot]; }
    static float enemyZ(int realm, int slot) { return (extended(realm) ? new float[] {20, 44, 70, 96, 118} : new float[] {22, 38, 57, 74, 96})[slot]; }
    static float memoryX(int realm, int index) { return (index % 2 == 0 ? -1 : 1) * (extended(realm) ? 8 : 7); }
    static float memoryZ(int realm, int index) { return extended(realm) ? 13 + 37 * index : 14 + 29 * index; }
    static float chestZ(int realm) { return extended(realm) ? 123 : 104; }
    static int submapCount(int realm) { return validRealm(realm) ? MAP_NAMES[realm].length : 0; }
    static boolean validSubmap(int realm, int submap) { return validRealm(realm) && submap >= 0 && submap < submapCount(realm); }
    static int requiredLevel(int realm, int submap) { return LEVELS[realm]; }
    static String mapName(int realm, int submap) { return MAP_NAMES[realm][submap]; }
    static String story(int realm, int submap) { return submap == 0 ? STORIES[realm]
            : "循着回忆来到" + mapName(realm, submap) + "，寻找三份信物，净化迷途山灵，与守护者完成「" + JOURNEYS[realm][submap] + "」的约定。"; }
    static boolean hasEnemies(int realm, int submap) { return !(realm == 0 && submap == 0); }
    static String memoryName(int realm, int submap, int index) { return submap == 0 ? MEMORIES[realm * 3 + index]
            : mapName(realm, submap) + new String[] {"书签", "来信", "约定"}[index]; }
    static float spawnX(int realm, int submap) { return -.65f; }
    static float spawnZ(int realm, int submap) { return 0; }
    static float enemyX(int realm, int submap, int slot) { return enemyX(slot); }
    static float enemyZ(int realm, int submap, int slot) { return enemyZ(realm, slot); }
    static float memoryX(int realm, int submap, int index) { return memoryX(realm, index); }
    static float memoryZ(int realm, int submap, int index) { return memoryZ(realm, index); }
    static float chestX(int realm, int submap) { return 0; }
    static float chestZ(int realm, int submap) { return chestZ(realm); }
    static String bossName(int realm, int submap) { return SUBMAP_BOSSES[realm][submap]; }
    static boolean positionValid(int realm, float x, float z) { return positionValid(realm, 0, x, z); }
    static boolean positionValid(int realm, int submap, float x, float z) {
        if (!validSubmap(realm, submap) || !Float.isFinite(x) || !Float.isFinite(z)) return false;
        if (Math.abs(x) > width(realm) || z < -16 || z > maxZ(realm)) return false;
        if (realm == 2 && x > 24.85 + Math.sin(z * .055) * 3.3 + Math.sin(z * .13) * 1.1) return false;
        return realm >= 2 || z <= 77.4f || z >= 80.6f || x >= -10.3f && x <= 6.3f;
    }
    static double distance(float ax, float az, float bx, float bz) { return Math.hypot(ax - bx, az - bz); }
    private NativeAdventureCatalog() { }
}
