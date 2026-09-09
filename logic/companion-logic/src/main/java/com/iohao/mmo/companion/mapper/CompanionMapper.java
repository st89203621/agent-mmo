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
package com.iohao.mmo.companion.mapper;

import com.iohao.mmo.companion.entity.SpiritCompanion;
import com.iohao.mmo.companion.proto.CompanionMessage;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

/**
 * @author 渔民小镇
 * @date 2025-10-15
 */
@Mapper
public interface CompanionMapper {
    CompanionMapper ME = Mappers.getMapper(CompanionMapper.class);
    
    CompanionMessage convert(SpiritCompanion companion);
    
    List<CompanionMessage> convertList(List<SpiritCompanion> companions);
}

