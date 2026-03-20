package com.iohao.mmo.shop.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;

public interface ShopCmd {
    int cmd = 17;

    int listItems = 0;
    int getItemInfo = 1;
    int purchaseItem = 2;
    int getPurchaseHistory = 3;
    int getPlayerCurrency = 4;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}

