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
package com.iohao.mmo.pet.service;

import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.common.kit.RandomKit;
import com.iohao.mmo.common.provide.client.CommonExchange;
import com.iohao.mmo.common.provide.proto.ShowItemMessage;
import com.iohao.mmo.pet.entity.*;
import com.iohao.mmo.pet.mapper.PetMapper;
import com.iohao.mmo.pet.proto.CreatePetMessage;
import com.iohao.mmo.pet.proto.UpdatePetImageMessage;
import com.iohao.mmo.pet.proto.UpdatePetPropertyMessage;
import com.iohao.mmo.pet.proto.internal.EnhancePetSkillMessage;
import com.iohao.mmo.pet.repository.PetBagRepository;
import org.bson.types.ObjectId;
import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * @author 渔民小镇
 * @date 2023-08-29
 */
@Slf4j
@Service
@AllArgsConstructor()
public class PetService {
    final PetBagRepository petBagRepository;
    final MongoTemplate mongoTemplate;

    final Map<String, PetSkillTemplate> skillTemplateMap = new HashMap<>();
    List<PetTemplate> templateList;
    List<PetSkillTemplate> skillTemplateList;

    @PostConstruct
    private void init() {
        templateList = mongoTemplate.findAll(PetTemplate.class);
        skillTemplateList = mongoTemplate.findAll(PetSkillTemplate.class);
        skillTemplateList.forEach(skillTemplate -> this.skillTemplateMap.put(skillTemplate.getSkill(), skillTemplate));
    }

    public List<PetTemplate> listPetTemplates() {
        return this.templateList;
    }

    public List<PetSkillTemplate> listPetSkillTemplate() {
        return this.skillTemplateList;
    }

    public PetSkillTemplate getPetSkillTemplate(String skill) {
        return this.skillTemplateMap.get(skill);
    }

    public PetBag ofPetBag(long userId) {
        return petBagRepository.findById(userId).orElseGet(() -> {

            PetBag petBag = new PetBag();
            petBag.setUserId(userId);
            petBag.setPetMap(new ConcurrentHashMap<>());

            this.petBagRepository.save(petBag);

            return petBag;
        });
    }

    public Collection<Pet> listPet(long userId) {
        PetBag petBag = ofPetBag(userId);
        return petBag.listPet();
    }

    public void randomPet(FlowContext flowContext) {

        // 随机一个宠物
        PetTemplate petTemplate = RandomKit.randomEle(templateList);

        long userId = flowContext.getUserId();
        PetBag petBag = ofPetBag(userId);
        Pet pet = petTemplate.createPet();
        petBag.addPet(pet);

        this.save(petBag);

        CommonExchange.broadcastSingleShowItem(() -> ShowItemMessage.of(petTemplate.getId()), flowContext);
    }

    public Pet updatePetProperty(UpdatePetPropertyMessage petProperty, FlowContext flowContext) {
        long userId = flowContext.getUserId();

        PetBag petBag = ofPetBag(userId);
        Pet pet = petBag.getPet(petProperty.petId);
        if (Objects.isNull(pet)) {
            return null;
        }

        PetMapper.ME.to(petProperty, pet);

        pet.verifyProperty();

        save(petBag);

        return pet;
    }

    public Pet enhancePetSkill(EnhancePetSkillMessage petSkillMessage, FlowContext flowContext) {

        PetBag petBag = ofPetBag(flowContext.getUserId());

        String petId = petSkillMessage.petId;
        Pet pet = petBag.getPet(petId);
        if (Objects.isNull(pet)) {
            return null;
        }

        PetSkill petSkill = PetMapper.ME.convert(petSkillMessage);
        pet.addSkill(petSkill);

        save(petBag);

        return pet;
    }

    public void deletePet(String petId, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        PetBag petBag = ofPetBag(userId);

        petBag.optionalPet(petId).ifPresent(pet -> {
            petBag.deletePet(petId);
            save(petBag);
        });
    }

    public Pet createPet(CreatePetMessage createPetMessage, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        PetBag petBag = ofPetBag(userId);

        PetTemplate petTemplate = templateList.stream()
            .filter(t -> t.getId().equals(createPetMessage.petTemplateId))
            .findFirst()
            .orElse(RandomKit.randomEle(templateList));

        Pet pet = petTemplate.createPet();

        if (createPetMessage.nickname != null && !createPetMessage.nickname.isEmpty()) {
            pet.setNickname(createPetMessage.nickname);
        }

        pet.setAiImageUrl(createPetMessage.aiImageUrl);
        pet.setPetType(createPetMessage.petType);
        pet.setElement(createPetMessage.element);
        pet.setArtStyle(createPetMessage.artStyle);

        petBag.addPet(pet);
        save(petBag);

        CommonExchange.broadcastSingleShowItem(() -> ShowItemMessage.of(petTemplate.getId()), flowContext);

        return pet;
    }

    public Pet updatePetImage(UpdatePetImageMessage updatePetImageMessage, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        PetBag petBag = ofPetBag(userId);

        Pet pet = petBag.getPet(updatePetImageMessage.petId);
        if (Objects.isNull(pet)) {
            return null;
        }

        pet.setAiImageUrl(updatePetImageMessage.aiImageUrl);
        pet.setPetType(updatePetImageMessage.petType);
        pet.setElement(updatePetImageMessage.element);
        pet.setArtStyle(updatePetImageMessage.artStyle);

        save(petBag);

        return pet;
    }

    public void save(PetBag petBag) {
        this.petBagRepository.save(petBag);
    }
}
