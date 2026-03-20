package com.iohao.mmo.enchant.service;

import com.iohao.mmo.enchant.entity.EnchantRune;
import com.iohao.mmo.enchant.entity.EquipEnchant;
import com.iohao.mmo.enchant.repository.EquipEnchantRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Random;

@Slf4j
@Service
public class EnchantService {
    @Resource
    EquipEnchantRepository equipEnchantRepository;
    
    private final Random random = new Random();
    private static final int GUARANTEE_COUNT = 8;
    
    public EquipEnchant getOrCreateEnchant(String equipId, long userId) {
        EquipEnchant enchant = equipEnchantRepository.findByEquipId(equipId);
        if (Objects.isNull(enchant)) {
            enchant = new EquipEnchant();
            enchant.setEquipId(equipId);
            enchant.setUserId(userId);
            enchant.setEnchantLevel(0);
            enchant.setGuaranteeCount(0);
            enchant = equipEnchantRepository.save(enchant);
        }
        return enchant;
    }
    
    public EquipEnchant enchantEquip(String equipId, long userId, EnchantRune.RuneLevel runeLevel) {
        EquipEnchant enchant = getOrCreateEnchant(equipId, userId);
        
        if (enchant.getEnchantLevel() >= 10) {
            log.warn("装备已达最大附魔等级");
            return enchant;
        }
        
        enchant.increaseGuarantee();
        
        boolean success = false;
        int minLevel = 0;
        int maxLevel = 0;
        
        if (enchant.getGuaranteeCount() >= GUARANTEE_COUNT) {
            success = true;
            minLevel = 3;
            maxLevel = 10;
        } else {
            double rate = runeLevel.getRate();
            success = random.nextDouble() < rate;
            
            if (success) {
                minLevel = runeLevel.getMinLevel();
                maxLevel = runeLevel.getMaxLevel();
            }
        }
        
        if (success) {
            int levelIncrease = minLevel + random.nextInt(maxLevel - minLevel + 1);
            int newLevel = Math.min(enchant.getEnchantLevel() + levelIncrease, 10);
            enchant.setEnchantLevel(newLevel);
            enchant.setGuaranteeCount(0);
            enchant.setTotalAttributeBonus(enchant.getAttributeBonusPercent());
            
            log.info("附魔成功! 装备: {}, 新等级: 魔{}", equipId, newLevel);
        } else {
            log.info("附魔失败! 装备: {}, 保底计数: {}/8", equipId, enchant.getGuaranteeCount());
        }
        
        enchant.setLastEnchantTime(System.currentTimeMillis());
        return equipEnchantRepository.save(enchant);
    }
}

