package com.iohao.mmo.quest.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface QuestCmd {
    int cmd = CmdModule.questCmd;
    
    int listQuest = 1;
    int acceptQuest = 2;
    int completeQuest = 3;
    int abandonQuest = 4;
    int updateProgress = 5;
    int getQuestReward = 6;
    int listAvailableQuest = 7;
    
    int broadcastQuestUpdate = 100;
    int broadcastQuestComplete = 101;
    
    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}

