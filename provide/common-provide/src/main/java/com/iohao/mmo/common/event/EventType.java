package com.iohao.mmo.common.event;

/**
 * 活动类型枚举
 */
public enum EventType {
    /** 天降神宠 */
    DIVINE_PET("天降神宠", "从天而降的神秘宠物蛋"),
    
    /** 世界BOSS */
    WORLD_BOSS("世界BOSS", "全服玩家共同挑战强大BOSS"),
    
    /** 限时秘境 */
    TIMED_REALM("限时秘境", "限时开放的特殊秘境"),
    
    /** 幸运转盘 */
    LUCKY_WHEEL("幸运转盘", "转动幸运转盘获得丰厚奖励");
    
    private final String name;
    private final String description;
    
    EventType(String name, String description) {
        this.name = name;
        this.description = description;
    }
    
    public String getName() {
        return name;
    }
    
    public String getDescription() {
        return description;
    }
}

