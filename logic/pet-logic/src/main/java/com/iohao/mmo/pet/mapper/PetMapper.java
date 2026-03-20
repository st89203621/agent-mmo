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
package com.iohao.mmo.pet.mapper;

import com.iohao.mmo.pet.entity.Pet;
import com.iohao.mmo.pet.entity.PetSkill;
import com.iohao.mmo.pet.entity.PetSkillTemplate;
import com.iohao.mmo.pet.entity.PetTemplate;
import com.iohao.mmo.pet.proto.PetMessage;
import com.iohao.mmo.pet.proto.PetSkillTemplateMessage;
import com.iohao.mmo.pet.proto.PetTemplateMessage;
import com.iohao.mmo.pet.proto.UpdatePetPropertyMessage;
import com.iohao.mmo.pet.proto.internal.EnhancePetSkillMessage;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

import java.util.Collection;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-08-30
 */
@Mapper
public interface PetMapper {
    PetMapper ME = Mappers.getMapper(PetMapper.class);

    PetMessage convert(Pet pet);

    List<PetMessage> convertPets(Collection<Pet> pets);

    PetTemplateMessage convert(PetTemplate petTemplate);

    List<PetTemplateMessage> convertPetTemplates(Collection<PetTemplate> petTemplates);

    void to(UpdatePetPropertyMessage petPropertyMessage, @MappingTarget Pet pet);

    PetSkill convert(EnhancePetSkillMessage petSkillMessage);

    List<PetSkillTemplateMessage> convertPetSkillTemplates(List<PetSkillTemplate> petSkillTemplates);
}
