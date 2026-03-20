package com.iohao.mmo.enchant.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.enchant.cmd.EnchantCmd;
import com.iohao.mmo.enchant.entity.EnchantRune;
import com.iohao.mmo.enchant.entity.EquipEnchant;
import com.iohao.mmo.enchant.mapper.EnchantMapper;
import com.iohao.mmo.enchant.proto.EnchantMessage;
import com.iohao.mmo.enchant.service.EnchantService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ActionController(EnchantCmd.cmd)
public class EnchantAction {
    @Resource
    EnchantService enchantService;
    
    @ActionMethod(EnchantCmd.enchantEquip)
    public EnchantMessage enchantEquip(EnchantMessage message, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        
        EnchantRune.RuneLevel runeLevel = EnchantRune.RuneLevel.SMALL;
        if (message.runeId != null) {
            switch (message.runeId) {
                case "rune_medium" -> runeLevel = EnchantRune.RuneLevel.MEDIUM;
                case "rune_large" -> runeLevel = EnchantRune.RuneLevel.LARGE;
                case "rune_super" -> runeLevel = EnchantRune.RuneLevel.SUPER;
            }
        }
        
        EquipEnchant enchant = enchantService.enchantEquip(message.equipId, userId, runeLevel);
        return EnchantMapper.ME.convert(enchant);
    }
    
    @ActionMethod(EnchantCmd.getEnchantInfo)
    public EnchantMessage getEnchantInfo(EnchantMessage message, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        EquipEnchant enchant = enchantService.getOrCreateEnchant(message.equipId, userId);
        return EnchantMapper.ME.convert(enchant);
    }
}

