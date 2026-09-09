package com.iohao.mmo.enchant.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface EnchantCmd {
    int cmd = CmdModule.enchantCmd;
    
    int enchantEquip = 1;
    int upgradeEnchant = 2;
    int exchangeRune = 3;
    int getEnchantInfo = 4;
    /** 声望/荣誉附魔，失败可能降级 */
    int prestigeEnchant = 5;
    
    int broadcastEnchantSuccess = 100;
    
    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}

