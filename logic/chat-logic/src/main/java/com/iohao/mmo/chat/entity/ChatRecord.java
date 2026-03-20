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
package com.iohao.mmo.chat.entity;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 聊天记录实体
 *
 * @author 沈涛
 * @date 2025-06-25
 */
@Getter
@Setter
@ToString
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatRecord {
    @Id
    String id;
    /** 发送者用户ID */
    long senderId;
    /** 发送者昵称 */
    String senderName;
    /** 接收者用户ID（私聊时使用，世界聊天为0） */
    long receiverId;
    /** 消息内容 */
    String content;
    /** 聊天类型：1-世界聊天，2-私聊 */
    int chatType;
    /** 发送时间戳 */
    long timestamp;
}
