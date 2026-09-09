package com.iohao.mmo.trade.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface TradeCmd {
    int cmd = CmdModule.tradeCmd;

    int listTrades = 1;
    int createTrade = 2;
    int acceptTrade = 3;
    int cancelTrade = 4;
    int getMyTrades = 5;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
