package com.iohao.mmo.rebirth.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface RebirthCmd {
    int cmd = CmdModule.rebirthCmd;

    int getCurrentWorld = 1;
    int getWorldHistory = 2;
    int selectNextWorld = 3;
    int doRebirth = 4;
    int getRebirthPoem = 5;
    int getWorldSummary = 6;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
