package com.iohao.mmo.teambattle.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface TeamBattleCmd {
    int cmd = CmdModule.teamBattleCmd;

    int createTeam = 1;
    int joinTeam = 2;
    int leaveTeam = 3;
    int startMatch = 4;
    int getTeamInfo = 5;
    int getBattleResult = 6;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
