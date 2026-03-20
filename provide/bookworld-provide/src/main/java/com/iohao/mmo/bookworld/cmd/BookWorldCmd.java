package com.iohao.mmo.bookworld.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface BookWorldCmd {
    int cmd = CmdModule.bookWorldCmd;

    int listBooks = 1;
    int getBookDetail = 2;
    int selectBook = 3;
    int uploadCustomBook = 4;
    int getSelectedBook = 5;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
