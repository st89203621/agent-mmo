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

import com.iohao.mmo.bag.entity.ItemTypeConfig;
import com.iohao.mmo.bag.proto.ItemMessage;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.Collection;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-08-12
 */
@Mapper
public interface ItemMapper {
    ItemMapper ME = Mappers.getMapper(ItemMapper.class);

    ItemMessage convert(ItemTypeConfig itemTypeConfig);

    List<ItemMessage> convert(Collection<ItemTypeConfig> itemTypeConfigs);
}
