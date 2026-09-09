package com.iohao.mmo.treasure.entity;

import lombok.Getter;

/**
 * 宝山类型枚举
 * 6种宝山，每种产出不同资源
 */
@Getter
public enum MountainType {
    GOLD("金币宝山", "产出大量金币", 1, 10),
    EXP("经验宝山", "产出大量经验", 20, 8),
    MATERIAL("材料宝山", "产出稀有材料", 30, 6),
    ENCHANT("附魔宝山", "产出附魔符文", 40, 5),
    EQUIP("装备宝山", "产出高品装备", 50, 4),
    DIVINE("神器宝山", "产出神级材料", 60, 3);

    private final String displayName;
    private final String description;
    /** 盟会等级要求 */
    private final int requiredGuildLevel;
    /** 每日最大挖掘次数 */
    private final int maxDigTimes;

    MountainType(String displayName, String description, int requiredGuildLevel, int maxDigTimes) {
        this.displayName = displayName;
        this.description = description;
        this.requiredGuildLevel = requiredGuildLevel;
        this.maxDigTimes = maxDigTimes;
    }
}
