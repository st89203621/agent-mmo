package com.iohao.mmo.guild.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

public interface GuildCmd {
    int cmd = CmdModule.guildCmd;

    /** 获取盟会信息 */
    int getGuild = 1;
    /** 创建盟会 */
    int createGuild = 2;
    /** 加入盟会 */
    int joinGuild = 3;
    /** 退出盟会 */
    int leaveGuild = 4;
    /** 获取成员列表 */
    int listMembers = 5;
    /** 捐献材料（增加建设值） */
    int donate = 6;
    /** 捐献金币（增加贡献值） */
    int donateGold = 7;
    /** 获取盟会列表 */
    int listGuilds = 8;
    /** 解散盟会 */
    int dissolve = 9;
    /** 踢出成员 */
    int kickMember = 10;
    /** 设置职位 */
    int setPosition = 11;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
