package com.iohao.mmo.enchant.service;

import com.iohao.mmo.enchant.entity.EnchantRune;
import com.iohao.mmo.enchant.entity.EquipEnchant;
import com.iohao.mmo.enchant.repository.EquipEnchantRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Random;

/**
 * 附魔服务
 * 双通道附魔机制：
 * 1. 材料附魔（1-6级）：使用符文材料，按符文等级有不同成功率
 * 2. 声望/荣誉附魔（4级以上可用）：成功率较高但失败降2级
 * 10级魔提升装备属性300%
 */
@Slf4j
@Service
public class EnchantService {
    @Resource
    EquipEnchantRepository equipEnchantRepository;

    private final Random random = new Random();
    private static final int MAX_ENCHANT_LEVEL = 10;
    private static final int GUARANTEE_COUNT = 8;
    /** 材料附魔最高到6级 */
    private static final int MATERIAL_MAX_LEVEL = 6;

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

    /**
     * 材料附魔（1-6级）
     * 使用符文，按等级有不同成功率和增长范围
     */
    public EquipEnchant enchantEquip(String equipId, long userId, EnchantRune.RuneLevel runeLevel) {
        EquipEnchant enchant = getOrCreateEnchant(equipId, userId);

        if (enchant.getEnchantLevel() >= MAX_ENCHANT_LEVEL) {
            log.warn("装备已达最大附魔等级");
            return enchant;
        }

        // 材料附魔最高到6级
        if (enchant.getEnchantLevel() >= MATERIAL_MAX_LEVEL) {
            log.warn("材料附魔最高到{}级，请使用声望/荣誉附魔", MATERIAL_MAX_LEVEL);
            return enchant;
        }

        enchant.increaseGuarantee();

        boolean success;
        if (enchant.getGuaranteeCount() >= GUARANTEE_COUNT) {
            success = true;
        } else {
            success = random.nextDouble() < runeLevel.getRate();
        }

        if (success) {
            int newLevel = Math.min(enchant.getEnchantLevel() + 1, MATERIAL_MAX_LEVEL);
            enchant.setEnchantLevel(newLevel);
            enchant.setGuaranteeCount(0);
            enchant.setTotalAttributeBonus(enchant.getAttributeBonusPercent());
            log.info("材料附魔成功! 装备: {}, 新等级: 魔{}", equipId, newLevel);
        } else {
            log.info("材料附魔失败! 装备: {}, 保底计数: {}/{}", equipId, enchant.getGuaranteeCount(), GUARANTEE_COUNT);
        }

        enchant.setLastEnchantTime(System.currentTimeMillis());
        return equipEnchantRepository.save(enchant);
    }

    /**
     * 声望/荣誉附魔（4级以上可用，可附到10级）
     * 成功率：(11 - 当前等级) * 8%
     * 失败降2级
     */
    public EquipEnchant prestigeEnchant(String equipId, long userId) {
        EquipEnchant enchant = getOrCreateEnchant(equipId, userId);

        if (enchant.getEnchantLevel() >= MAX_ENCHANT_LEVEL) {
            log.warn("装备已达最大附魔等级");
            return enchant;
        }

        if (enchant.getEnchantLevel() < 4) {
            log.warn("声望附魔需要4级以上");
            return enchant;
        }

        double successRate = (MAX_ENCHANT_LEVEL + 1 - enchant.getEnchantLevel()) * 0.08;
        boolean success = random.nextDouble() < successRate;

        if (success) {
            enchant.setEnchantLevel(enchant.getEnchantLevel() + 1);
            enchant.setTotalAttributeBonus(enchant.getAttributeBonusPercent());
            log.info("声望附魔成功! 装备: {}, 新等级: 魔{}", equipId, enchant.getEnchantLevel());
        } else {
            enchant.decreaseEnchantLevel();
            enchant.setTotalAttributeBonus(enchant.getAttributeBonusPercent());
            log.info("声望附魔失败! 装备: {}, 降至: 魔{}", equipId, enchant.getEnchantLevel());
        }

        enchant.setLastEnchantTime(System.currentTimeMillis());
        return equipEnchantRepository.save(enchant);
    }
}
