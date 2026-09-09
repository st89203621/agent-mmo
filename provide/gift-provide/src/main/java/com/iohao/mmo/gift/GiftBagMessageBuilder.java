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
package com.iohao.mmo.gift;

import com.iohao.mmo.common.provide.proto.AttachmentMessage;
import com.iohao.mmo.gift.proto.GiftBagMessage;
import lombok.AccessLevel;
import lombok.Setter;
import lombok.experimental.Accessors;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

/**
 * 礼包
 *
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Setter
@Accessors(chain = true)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GiftBagMessageBuilder {
    /** 附件（奖励） */
    @Setter(AccessLevel.PRIVATE)
    List<AttachmentMessage> attachments = new ArrayList<>();

    GiftBagMessageBuilder() {
    }

    public static GiftBagMessageBuilder newBuilder() {
        return new GiftBagMessageBuilder();
    }

    /**
     * 添加奖励附件
     *
     * @param itemTypeId 物品类型 id
     * @param quantity   奖励数量
     * @return GiftBagMessageBuilder
     */
    public GiftBagMessageBuilder addAttachment(String itemTypeId, int quantity) {

        AttachmentMessage attachmentMessage = AttachmentMessage.create(itemTypeId, quantity);

        attachments.add(attachmentMessage);

        return this;
    }

    /**
     * 礼包
     *
     * @return GiftBagMessage
     */
    public GiftBagMessage build() {
        GiftBagMessage message = new GiftBagMessage();
        message.attachments = this.attachments;
        return message;
    }
}
