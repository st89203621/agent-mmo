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
package com.iohao.mmo.chat.repository;

import com.iohao.mmo.chat.entity.ChatRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

/**
 * 聊天记录仓库
 *
 * @author 沈涛
 * @date 2025-06-25
 */
public interface ChatRecordRepository extends MongoRepository<ChatRecord, String> {
    
    /**
     * 查询世界聊天记录
     */
    @Query("{'chatType': 1}")
    List<ChatRecord> findWorldChatRecords(Pageable pageable);
    
    /**
     * 查询私聊记录
     */
    @Query("{'chatType': 2, $or: [{'senderId': ?0, 'receiverId': ?1}, {'senderId': ?1, 'receiverId': ?0}]}")
    List<ChatRecord> findPrivateChatRecords(long userId1, long userId2, Pageable pageable);
}
