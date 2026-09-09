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
package com.iohao.mmo.map.mapper;

import com.iohao.mmo.map.proto.LocationMessage;
import com.iohao.mmo.map.proto.MapPlayerMessage;
import com.iohao.mmo.map.room.Location;
import com.iohao.mmo.map.room.MapPlayer;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

import java.util.Collection;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-07-27
 */
@Mapper
public interface MapMapper {
    MapMapper ME = Mappers.getMapper(MapMapper.class);

    void to(LocationMessage locationMessage, @MappingTarget Location location);

    LocationMessage convert(Location location);

    @org.mapstruct.Mapping(source = "userId", target = "id")
    MapPlayerMessage convert(MapPlayer tankPlayerEntity);

    List<MapPlayerMessage> convertList(Collection<MapPlayer> players);
}
