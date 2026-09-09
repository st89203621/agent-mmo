/*
 * ioGame
 * Copyright (C) 2021 - 2023  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
 * # iohao.com . 渔民小镇
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.iohao.mmo.mail.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * @author 渔民小镇
 * @date 2023-08-15
 */
public interface MailCmd {
    int cmd = CmdModule.mailCmd;
    /** 查看玩家邮件列表 */
    int listMail = 1;
    /** 添加邮件 */
    int addMail = 2;
    /** 删除单个邮件-指定邮件 */
    int deleteMail = 3;
    /** 一键删除多个邮件，删除所有已开封和过期的邮件 */
    int deleteMails = 4;
    /** 打开单个邮件-指定邮件 */
    int openMail = 5;
    /** 打开多个邮件-所有未开封的邮件 */
    int openMails = 6;

    /** 新邮件 - 邮服务器推送 */
    int broadcastNewMail = 100;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
