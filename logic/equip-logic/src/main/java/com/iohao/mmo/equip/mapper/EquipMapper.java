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
package com.iohao.mmo.equip.mapper;

import com.iohao.mmo.equip.entity.ElseEquipProperty;
import com.iohao.mmo.equip.entity.Equip;
import com.iohao.mmo.equip.entity.EquipTemplate;
import com.iohao.mmo.equip.proto.ElseEquipPropertyMessage;
import com.iohao.mmo.equip.proto.EquipMessage;
import com.iohao.mmo.equip.proto.EquipTemplateMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;
import java.util.List;

/**
 * @author 唐斌
 * @date 2023-07-30
 */
@Mapper
public interface EquipMapper {
    EquipMapper ME = Mappers.getMapper(EquipMapper.class);

    @Mapping(source = "id", target = "id")
    EquipMessage convert(Equip equip);

    List<EquipMessage> convert(List<Equip> equipList);

    Equip convert(EquipMessage equipMessage);

    EquipTemplateMessage convert(EquipTemplate equipTemplate);
    ElseEquipPropertyMessage convert(ElseEquipProperty elseEquipProperty);
}
