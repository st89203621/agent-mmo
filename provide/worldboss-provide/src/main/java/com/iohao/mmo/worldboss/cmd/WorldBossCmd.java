package com.iohao.mmo.worldboss.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;

public interface WorldBossCmd {
    int cmd = 16;

    int listBoss = 0;
    int getBossInfo = 1;
    int attackBoss = 2;
    int getDamageRank = 3;
    int revive = 4;
    int useBossSkill = 5;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}

