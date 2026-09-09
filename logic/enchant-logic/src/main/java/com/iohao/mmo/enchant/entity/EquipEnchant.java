package com.iohao.mmo.enchant.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EquipEnchant {
    @Id
    String id;
    
    String equipId;
    long userId;
    
    int enchantLevel;
    int totalAttributeBonus;
    int guaranteeCount;
    
    long lastEnchantTime;
    
    public void increaseEnchantLevel() {
        this.enchantLevel++;
        this.guaranteeCount = 0;
    }
    
    public void increaseGuarantee() {
        this.guaranteeCount++;
    }
    
    /**
     * 附魔属性加成百分比
     * 10级魔提升300%，每级30%
     */
    public int getAttributeBonusPercent() {
        return enchantLevel * 30;
    }

    /**
     * 声望/荣誉附魔失败时降2级
     */
    public void decreaseEnchantLevel() {
        this.enchantLevel = Math.max(0, this.enchantLevel - 2);
    }
}

