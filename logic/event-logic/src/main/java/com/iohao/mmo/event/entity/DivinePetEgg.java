package com.iohao.mmo.event.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 天降神宠 - 宠物蛋实体
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DivinePetEgg {
    @Id
    String id;
    
    /** 所属活动ID */
    String eventId;
    
    /** 蛋的品质 */
    EggQuality quality;
    
    /** 掉落位置X */
    int posX;
    
    /** 掉落位置Y */
    int posY;
    
    /** 掉落时间 */
    long dropTime;
    
    /** 存活时间(毫秒) */
    long lifeTime;
    
    /** 是否已被砸开 */
    boolean smashed;
    
    /** 砸开者用户ID */
    Long smashedBy;
    
    /** 砸开时间 */
    Long smashTime;
    
    /** 宠物模板ID(砸开后生成) */
    String petTemplateId;
    
    /** 资质加成百分比 */
    int qualityBonus;
    
    /** 额外奖励 */
    String extraRewards;
    
    public enum EggQuality {
        /** 普通 - 白色 */
        COMMON("普通", 0, 0xFFFFFF),
        /** 优秀 - 绿色 */
        UNCOMMON("优秀", 10, 0x00FF00),
        /** 稀有 - 蓝色 */
        RARE("稀有", 25, 0x0080FF),
        /** 史诗 - 紫色 */
        EPIC("史诗", 50, 0x9933FF),
        /** 传说 - 橙色 */
        LEGENDARY("传说", 100, 0xFF8000),
        /** 神话 - 红色 */
        MYTHIC("神话", 200, 0xFF0000);
        
        private final String name;
        private final int qualityBonus;
        private final int color;
        
        EggQuality(String name, int qualityBonus, int color) {
            this.name = name;
            this.qualityBonus = qualityBonus;
            this.color = color;
        }
        
        public String getName() {
            return name;
        }
        
        public int getQualityBonus() {
            return qualityBonus;
        }
        
        public int getColor() {
            return color;
        }
    }
    
    public boolean isExpired() {
        return !smashed && (System.currentTimeMillis() - dropTime) > lifeTime;
    }
    
    public boolean canSmash() {
        return !smashed && !isExpired();
    }
}

