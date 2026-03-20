package com.iohao.mmo.enchant.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EnchantRune {
    @Id
    String id;
    
    String runeId;
    String runeName;
    int runeLevel;
    int minEnchantLevel;
    int maxEnchantLevel;
    double successRate;
    int attributeBonus;
    
    public enum RuneLevel {
        SMALL(1, "小型符文", 1, 3, 0.3, 100),
        MEDIUM(2, "中型符文", 3, 5, 0.2, 200),
        LARGE(3, "大型符文", 5, 7, 0.15, 300),
        SUPER(4, "超级符文", 7, 10, 0.1, 500);
        
        private final int level;
        private final String name;
        private final int minLevel;
        private final int maxLevel;
        private final double rate;
        private final int bonus;
        
        RuneLevel(int level, String name, int minLevel, int maxLevel, double rate, int bonus) {
            this.level = level;
            this.name = name;
            this.minLevel = minLevel;
            this.maxLevel = maxLevel;
            this.rate = rate;
            this.bonus = bonus;
        }
        
        public int getLevel() { return level; }
        public String getName() { return name; }
        public int getMinLevel() { return minLevel; }
        public int getMaxLevel() { return maxLevel; }
        public double getRate() { return rate; }
        public int getBonus() { return bonus; }
    }
}

