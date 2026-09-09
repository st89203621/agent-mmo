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
package com.iohao.mmo.chat.proto;

import com.baidu.bjf.remoting.protobuf.annotation.Protobuf;
import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

/**
 * 聊天消息
 *
 * @author 沈涛
 * @date 2025-06-25
 */
@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class ChatMessage {
    /** 消息ID */
    @Protobuf(order = 1)
    String messageId;

    /** 发送者用户ID */
    @Protobuf(order = 2)
    long senderId;

    /** 发送者昵称 */
    @Protobuf(order = 3)
    String senderName;

    /** 接收者用户ID（私聊时使用，世界聊天为0） */
    @Protobuf(order = 4)
    long receiverId;

    /** 消息内容 */
    @Protobuf(order = 5)
    String content;

    /** 聊天类型：1-世界聊天，2-私聊 */
    @Protobuf(order = 6)
    int chatType;

    /** 发送时间戳 */
    @Protobuf(order = 7)
    long timestamp;
}
