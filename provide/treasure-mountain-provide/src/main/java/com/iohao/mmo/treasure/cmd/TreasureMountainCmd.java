package com.iohao.mmo.treasure.cmd;

import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * 宝山路由
 */
public interface TreasureMountainCmd {
    int cmd = CmdModule.treasureMountainCmd;

    int listMountains = 1;
    int enterMountain = 2;
    int dig = 3;
    int getMountainStatus = 4;
}
