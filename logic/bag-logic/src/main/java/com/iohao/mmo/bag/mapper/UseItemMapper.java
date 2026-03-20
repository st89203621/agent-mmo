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

import com.iohao.game.common.kit.CollKit;
import com.iohao.mmo.bag.entity.BagItem;
import com.iohao.mmo.bag.pojo.UseItemPOJO;
import com.iohao.mmo.bag.pojo.UsePOJO;
import com.iohao.mmo.bag.proto.UseItemMessage;
import com.iohao.mmo.bag.proto.UseMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.*;

/**
 * @author 渔民小镇
 * @date 2023-08-06
 */
@Mapper
public interface UseItemMapper {
    UseItemMapper ME = Mappers.getMapper(UseItemMapper.class);

    BagItem convert(UseItemPOJO useItem);

    List<BagItem> convertToBagItem(Collection<UseItemPOJO> useItem);

    @Mapping(target = "useItemMap", source = "useItems")
    UsePOJO convert(UseMessage useMessage);

    UseItemPOJO convert(UseItemMessage useItemMessage);

    default Map<String, UseItemPOJO> convert(List<UseItemMessage> useItems) {
        if (CollKit.isEmpty(useItems)) {
            return Collections.emptyMap();
        }

        Map<String, UseItemPOJO> map = new HashMap<>();
        for (UseItemMessage useItem : useItems) {
            UseItemPOJO convert = convert(useItem);
            map.put(useItem.itemTypeId, convert);
        }

        return map;
    }
}
