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
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * @author 渔民小镇
 * @date 2023-08-29
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PetBag {
    @Id
    long userId;
    /** 玩家宠物宝宝 */
    Map<String, Pet> petMap;
    /** 进化经验 */
    int mutationExp;

    public void addPet(Pet pet) {
        this.petMap.put(pet.getId(), pet);
    }

    public Collection<Pet> listPet() {
        return petMap.values();
    }

    public Pet getPet(String petId) {
        return this.petMap.get(petId);
    }

    public Optional<Pet> optionalPet(String petId) {
        return Optional.ofNullable(this.petMap.get(petId));
    }

    public void deletePet(String petId) {
        this.petMap.remove(petId);
        mutationExp++;
    }
}
