package com.iohao.mmo.rank.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface RankCmd {
    int cmd = CmdModule.rankCmd;

    int getLevelRank = 1;
    int getPowerRank = 2;
    int getWealthRank = 3;
    int getAchievementRank = 4;
    int getPlayerRank = 5;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}

