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
package com.iohao.mmo.chat.service;

import com.iohao.mmo.chat.entity.ChatRecord;
import com.iohao.mmo.chat.repository.ChatRecordRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 聊天服务
 *
 * @author 沈涛
 * @date 2025-06-25
 */
@Slf4j
@Service
public class ChatService {
    
    @Resource
    ChatRecordRepository chatRecordRepository;
    
    /**
     * 保存聊天记录
     */
    public ChatRecord saveChatRecord(ChatRecord chatRecord) {
        if (chatRecord.getId() == null) {
            chatRecord.setId(new ObjectId().toString());
        }
        chatRecord.setTimestamp(System.currentTimeMillis());
        return chatRecordRepository.save(chatRecord);
    }
    
    /**
     * 获取世界聊天记录
     */
    public List<ChatRecord> getWorldChatRecords(int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "timestamp"));
        return chatRecordRepository.findWorldChatRecords(pageable);
    }
    
    /**
     * 获取私聊记录
     */
    public List<ChatRecord> getPrivateChatRecords(long userId1, long userId2, int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "timestamp"));
        return chatRecordRepository.findPrivateChatRecords(userId1, userId2, pageable);
    }
}
