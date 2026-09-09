package com.iohao.mmo.memory.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface MemoryCmd {
    int cmd = CmdModule.memoryCmd;

    int listMemories = 1;
    int getMemory = 2;
    int createMemory = 3;
    int listByWorld = 4;
    int getMemoryHall = 5;
    /** 用缘值激活记忆碎片 */
    int activateMemory = 6;
    /** 获取已激活的属性加成 */
    int getActivatedBonuses = 7;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
