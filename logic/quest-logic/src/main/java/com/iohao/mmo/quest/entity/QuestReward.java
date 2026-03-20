package com.iohao.mmo.quest.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuestReward {
    RewardType rewardType;
    String itemId;
    int quantity;
    int exp;
    int gold;
    
    public enum RewardType {
        EXP(1, "经验"),
        GOLD(2, "金币"),
        ITEM(3, "道具"),
        SKILL(4, "技能");
        
        private final int code;
        private final String name;
        
        RewardType(int code, String name) {
            this.code = code;
            this.name = name;
        }
        
        public int getCode() { return code; }
        public String getName() { return name; }
    }
}

