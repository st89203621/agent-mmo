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
package com.iohao.mmo.gift.mapper;

import com.iohao.mmo.bag.proto.BagItemMessage;
import com.iohao.mmo.common.provide.entity.CommonAttachment;
import com.iohao.mmo.common.provide.proto.AttachmentMessage;
import com.iohao.mmo.gift.entity.GiftBag;
import com.iohao.mmo.gift.proto.GiftBagMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.io.LineNumberInputStream;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Mapper
public interface GiftBagMapper {
    GiftBagMapper ME = Mappers.getMapper(GiftBagMapper.class);

    GiftBag convert(GiftBagMessage giftBagMessage);

    GiftBagMessage convert(GiftBag giftBag);

    List<GiftBagMessage> convertGiftBagMessage(List<GiftBag> giftBags);

    BagItemMessage convert(CommonAttachment mailAttachment);
}
