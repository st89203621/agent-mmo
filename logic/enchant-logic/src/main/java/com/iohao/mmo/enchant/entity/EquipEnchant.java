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
    
    public int getAttributeBonusPercent() {
        return enchantLevel * 55;
    }
}

