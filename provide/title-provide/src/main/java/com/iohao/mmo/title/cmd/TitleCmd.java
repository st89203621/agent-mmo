package com.iohao.mmo.title.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface TitleCmd {
    int cmd = CmdModule.titleCmd;

    /** 获取已拥有称号列表 */
    int listTitles = 1;
    /** 装备称号 */
    int equipTitle = 2;
    /** 卸下称号 */
    int unequipTitle = 3;
    /** 获取可解锁称号列表 */
    int listAvailable = 4;
    /** 获取当前装备的称号 */
    int getEquipped = 5;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
