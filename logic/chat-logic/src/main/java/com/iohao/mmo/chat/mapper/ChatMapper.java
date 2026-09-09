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
package com.iohao.mmo.chat.mapper;

import com.iohao.mmo.chat.entity.ChatRecord;
import com.iohao.mmo.chat.proto.ChatMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * 聊天消息映射器
 *
 * @author 沈涛
 * @date 2025-06-25
 */
@Mapper
public interface ChatMapper {
    ChatMapper ME = Mappers.getMapper(ChatMapper.class);

    @Mapping(target = "messageId", source = "id")
    ChatMessage convert(ChatRecord chatRecord);

    @Mapping(target = "id", source = "messageId")
    ChatRecord convert(ChatMessage chatMessage);

    List<ChatMessage> convertMessages(List<ChatRecord> chatRecords);
}
