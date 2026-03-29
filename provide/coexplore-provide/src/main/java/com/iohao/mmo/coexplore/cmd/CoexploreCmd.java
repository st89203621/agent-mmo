package com.iohao.mmo.coexplore.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface CoexploreCmd {
    int cmd = CmdModule.coexploreCmd;

    int createSession = 1;
    int joinSession = 2;
    int getSession = 3;
    int explore = 4;
    int gather = 5;
    int vote = 6;
    int bossBattle = 7;
    int leaveSession = 8;
    int listWaiting = 9;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
