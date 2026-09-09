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
package com.iohao.mmo.chat.action;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.commumication.BroadcastContext;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.bolt.broker.core.client.BrokerClientHelper;
import com.iohao.mmo.chat.cmd.ChatCmd;
import com.iohao.mmo.chat.entity.ChatRecord;
import com.iohao.mmo.chat.mapper.ChatMapper;
import com.iohao.mmo.chat.proto.ChatMessage;
import com.iohao.mmo.chat.proto.SendChatMessage;
import com.iohao.mmo.chat.service.ChatService;
import com.iohao.mmo.person.client.PersonExchange;
import com.iohao.mmo.person.proto.PersonMessage;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 聊天控制器
 *
 * @author 沈涛
 * @date 2025-06-25
 */
@Slf4j
@Component
@ActionController(ChatCmd.cmd)
public class ChatAction {
    
    @Resource
    ChatService chatService;
    
    /**
     * 发送世界聊天消息
     */
    @ActionMethod(ChatCmd.sendWorldMessage)
    public ChatMessage sendWorldMessage(String messageData, FlowContext flowContext) {
        long userId = flowContext.getUserId();

        log.info("收到世界聊天消息请求 - userId: {}, messageData: {}", userId, messageData);

        try {
            // 解析JSON字符串
            JSONObject jsonObject = JSON.parseObject(messageData);

            // 提取字段
            String content = jsonObject.getString("content");
            int chatType = jsonObject.getIntValue("chatType");
            long receiverId = jsonObject.getLongValue("receiverId");

            log.info("解析聊天消息 - content: '{}', chatType: {}, receiverId: {}", content, chatType, receiverId);

            // 验证消息内容
            if (content == null || content.trim().isEmpty()) {
                log.error("聊天消息内容为空");
                throw new RuntimeException("聊天消息内容不能为空");
            }

            // 获取发送者信息
            PersonMessage person = PersonExchange.getPerson(flowContext);
            log.info("发送者信息 - name: '{}'", person.name);

            // 创建聊天记录
            ChatRecord chatRecord = new ChatRecord();
            chatRecord.setSenderId(userId);
            chatRecord.setSenderName(person.name);
            chatRecord.setReceiverId(0); // 世界聊天
            chatRecord.setContent(content.trim());
            chatRecord.setChatType(1); // 世界聊天

            log.info("准备保存聊天记录 - {}", chatRecord);

            // 保存聊天记录
            chatRecord = chatService.saveChatRecord(chatRecord);

            // 转换为消息对象
            ChatMessage chatMessage = ChatMapper.ME.convert(chatRecord);
            log.info("转换后的聊天消息 - {}", chatMessage);

            // 广播给所有在线玩家
            CmdInfo cmdInfo = ChatCmd.of(ChatCmd.broadcastWorldMessage);
            BroadcastContext broadcastContext = BrokerClientHelper.getBroadcastContext();
            broadcastContext.broadcast(cmdInfo, chatMessage);

            log.info("世界聊天消息广播完成");
            return chatMessage;

        } catch (Exception e) {
            log.error("聊天消息处理失败: {}", messageData, e);
            throw new RuntimeException("聊天消息处理失败: " + e.getMessage());
        }
    }
    
    /**
     * 发送私聊消息
     */
    @ActionMethod(ChatCmd.sendPrivateMessage)
    public ChatMessage sendPrivateMessage(String messageData, FlowContext flowContext) {
        long userId = flowContext.getUserId();

        log.info("收到私聊消息请求 - userId: {}, messageData: {}", userId, messageData);

        try {
            // 解析JSON字符串
            JSONObject jsonObject = JSON.parseObject(messageData);

            // 提取字段
            String content = jsonObject.getString("content");
            int chatType = jsonObject.getIntValue("chatType");
            long receiverId = jsonObject.getLongValue("receiverId");

            log.info("解析私聊消息 - content: '{}', chatType: {}, receiverId: {}", content, chatType, receiverId);

            // 验证消息内容
            if (content == null || content.trim().isEmpty()) {
                log.error("私聊消息内容为空");
                throw new RuntimeException("私聊消息内容不能为空");
            }

            // 获取发送者信息
            PersonMessage person = PersonExchange.getPerson(flowContext);

            // 创建聊天记录
            ChatRecord chatRecord = new ChatRecord();
            chatRecord.setSenderId(userId);
            chatRecord.setSenderName(person.name);
            chatRecord.setReceiverId(receiverId);
            chatRecord.setContent(content.trim());
            chatRecord.setChatType(2); // 私聊

            // 保存聊天记录
            chatRecord = chatService.saveChatRecord(chatRecord);

            // 转换为消息对象
            ChatMessage chatMessage = ChatMapper.ME.convert(chatRecord);

            // 发送给接收者
            CmdInfo cmdInfo = ChatCmd.of(ChatCmd.broadcastPrivateMessage);
            BroadcastContext broadcastContext = BrokerClientHelper.getBroadcastContext();
            broadcastContext.broadcast(cmdInfo, chatMessage, receiverId);

            log.info("私聊消息发送完成");
            return chatMessage;

        } catch (Exception e) {
            log.error("私聊消息处理失败: {}", messageData, e);
            throw new RuntimeException("私聊消息处理失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取聊天历史
     */
    @ActionMethod(ChatCmd.getChatHistory)
    public List<ChatMessage> getChatHistory(FlowContext flowContext) {
        // 获取最近50条世界聊天记录
        List<ChatRecord> records = chatService.getWorldChatRecords(50);
        return ChatMapper.ME.convertMessages(records);
    }
}
