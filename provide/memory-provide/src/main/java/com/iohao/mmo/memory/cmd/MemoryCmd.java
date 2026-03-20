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

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
