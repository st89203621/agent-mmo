package com.iohao.mmo.flower.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface FlowerCmd {
    int cmd = CmdModule.flowerCmd;

    int getFlower = 1;
    int waterFlower = 2;
    int getFlowerHistory = 3;
    int bloomFlower = 4;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
