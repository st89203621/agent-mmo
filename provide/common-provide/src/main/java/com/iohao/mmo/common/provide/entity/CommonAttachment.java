/*
 * ioGame
 * Copyright (C) 2021 - 2024  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
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
package com.iohao.mmo.common.provide.entity;

import com.iohao.mmo.common.provide.proto.AttachmentMessage;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Objects;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Data
@Document("commonAttachment")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommonAttachment {
    @Id
    String id;
    /** 物品类型 id */
    String itemTypeId;
    /** 物品数量 */
    int quantity;

    public static CommonAttachment create(String itemTypeId, int quantity) {
        if (quantity < 0) {
            throw new IllegalArgumentException();
        }

        Objects.requireNonNull(itemTypeId);

        CommonAttachment attachmentMessage = new CommonAttachment();
        attachmentMessage.id = itemTypeId;
        attachmentMessage.itemTypeId = itemTypeId;
        attachmentMessage.quantity = quantity;

        return attachmentMessage;
    }
}
