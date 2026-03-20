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
package com.iohao.mmo.pet.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * 宠物（宝宝）模板库
 *
 * @author 渔民小镇
 * @date 2023-08-29
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PetTemplate {
    @Id
    String id;
    /** 宠物（宝宝）名 */
    String name;
    /** 描述 */
    String description;
    /**  */
    List<PetTransformationTemplate> transformationList;

    public void addTransformation(PetTransformationTemplate transformation) {
        if (Objects.isNull(transformationList)) {
            this.transformationList = new ArrayList<>();
        }

        this.transformationList.add(transformation);
    }

    public Pet createPet() {

        var transformationTemplate = this.transformationList.get(0);

        Pet pet = new Pet();
        pet.setId(new ObjectId().toString());
        pet.setPetTemplateId(this.id);
        pet.setNickname(this.name);
        pet.setMutationNo(transformationTemplate.getMutationNo());
        pet.setMutationSkin(transformationTemplate.getMutationSkin());
        pet.setPropertyPointNum(transformationTemplate.getPropertyPointNum());
        pet.setMaxSkill(4);

        return pet;
    }
}
