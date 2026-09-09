package com.iohao.mmo.story.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface StoryCmd {
    int cmd = CmdModule.storyCmd;

    int startDialogue = 1;
    int sendChoice = 2;
    int sendFreeInput = 3;
    int endDialogue = 4;
    int getNpcInfo = 5;
    int listNpcs = 6;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
