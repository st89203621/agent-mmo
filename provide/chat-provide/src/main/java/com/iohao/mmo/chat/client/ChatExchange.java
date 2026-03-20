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
package com.iohao.mmo.chat.client;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.protocol.ResponseMessage;
import com.iohao.mmo.chat.cmd.ChatCmd;
import com.iohao.mmo.chat.proto.ChatMessage;
import com.iohao.mmo.chat.proto.SendChatMessage;
import lombok.experimental.UtilityClass;

import java.util.List;

/**
 * 聊天模块，对外提供的访问 api
 *
 * @author 沈涛
 * @date 2025-06-25
 */
@UtilityClass
public class ChatExchange {
    
    /**
     * 发送聊天消息
     *
     * @param sendChatMessage 发送消息请求
     * @param flowContext     flowContext
     * @return ChatMessage
     */
    public ChatMessage sendMessage(SendChatMessage sendChatMessage, FlowContext flowContext) {
        CmdInfo cmdInfo = ChatCmd.of(sendChatMessage.chatType == 1 ? 
            ChatCmd.sendWorldMessage : ChatCmd.sendPrivateMessage);
        ResponseMessage responseMessage = flowContext.invokeModuleMessage(cmdInfo, sendChatMessage);
        return responseMessage.getData(ChatMessage.class);
    }
    
    /**
     * 获取聊天历史
     *
     * @param flowContext flowContext
     * @return 聊天历史列表
     */
    public List<ChatMessage> getChatHistory(FlowContext flowContext) {
        CmdInfo cmdInfo = ChatCmd.of(ChatCmd.getChatHistory);
        ResponseMessage responseMessage = flowContext.invokeModuleMessage(cmdInfo, null);
        return responseMessage.getData(List.class);
    }
}
