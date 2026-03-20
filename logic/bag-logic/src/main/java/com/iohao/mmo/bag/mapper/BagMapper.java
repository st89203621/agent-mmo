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
package com.iohao.mmo.bag.mapper;

import com.iohao.mmo.bag.entity.Bag;
import com.iohao.mmo.bag.entity.BagItem;
import com.iohao.mmo.bag.proto.BagItemMessage;
import com.iohao.mmo.bag.proto.BagMessage;
import com.iohao.mmo.common.provide.proto.ShowItemMessage;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-08-04
 */
@Mapper
public interface BagMapper {
    BagMapper ME = Mappers.getMapper(BagMapper.class);

    BagMessage convert(Bag bag);

    BagItemMessage convert(BagItem bagItem);

    BagItem convert(BagItemMessage bagItemMessage);

    List<BagItem> convertBagItems(List<BagItemMessage> bagItemMessages);

    List<BagItemMessage> convertBagItemMessages(List<BagItem> bagItems);

    void to(BagItem bagItem, @MappingTarget BagItemMessage bagItemMessage);

    ShowItemMessage convertShowItem(BagItemMessage bagItemMessage);

    List<ShowItemMessage> convertShowItems(List<BagItemMessage> bagItemMessages);
}
