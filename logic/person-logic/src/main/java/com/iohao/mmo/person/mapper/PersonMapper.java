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
package com.iohao.mmo.person.mapper;

import com.iohao.mmo.person.entity.BasicProperty;
import com.iohao.mmo.person.entity.Person;
import com.iohao.mmo.person.proto.BasicPropertyMessage;
import com.iohao.mmo.person.proto.PersonMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * @author 渔民小镇
 * @date 2023-07-24
 */
@Mapper
public interface PersonMapper {
    PersonMapper ME = Mappers.getMapper(PersonMapper.class);

    @Mapping(source = "id", target = "userId")
    PersonMessage convert(Person person);

    BasicPropertyMessage convert(BasicProperty basicProperty);
}
