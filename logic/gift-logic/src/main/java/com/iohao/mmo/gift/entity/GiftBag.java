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
package com.iohao.mmo.gift.entity;

import com.iohao.game.common.kit.CollKit;
import com.iohao.mmo.common.provide.entity.CommonAttachment;
import com.iohao.mmo.common.provide.proto.AttachmentMessage;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GiftBag {
    @Id
    String id;
    /** 附件（奖励） */
    List<CommonAttachment> attachments;

    public GiftBag addAttachment(String itemTypeId, int quantity) {
        if (CollKit.isEmpty(this.attachments)) {
            this.attachments = new ArrayList<>();
        }

        CommonAttachment commonAttachment = CommonAttachment.create(itemTypeId, quantity);

        attachments.add(commonAttachment);

        return this;
    }
}
