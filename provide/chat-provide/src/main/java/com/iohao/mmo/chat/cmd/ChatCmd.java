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
package com.iohao.mmo.chat.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * 聊天模块命令
 *
 * @author 沈涛
 * @date 2025-06-25
 */
public interface ChatCmd {
    int cmd = CmdModule.chatCmd;
    
    /** 发送世界聊天消息 */
    int sendWorldMessage = 1;
    /** 发送私聊消息 */
    int sendPrivateMessage = 2;
    /** 获取聊天历史 */
    int getChatHistory = 3;
    
    /** 世界聊天广播 */
    int broadcastWorldMessage = 100;
    /** 私聊消息广播 */
    int broadcastPrivateMessage = 101;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
