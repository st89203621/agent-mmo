package com.iohao.mmo.fate.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface FateCmd {
    int cmd = CmdModule.fateCmd;

    int getRelations = 1;
    int getFateMap = 2;
    int applyChoice = 3;
    int getNpcRelation = 4;
    int getTopRelations = 5;
    int decayFateScores = 6;
    /** 获取全局缘值/信值 */
    int getGlobalFate = 7;
    /** 缘值/信值变更广播 */
    int broadcastFateChange = 8;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
