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
import java.util.concurrent.ThreadLocalRandom;

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

    // ── 宠物品种池（内存） ──────────────────────────
    private static final String[] TIER_NAMES = {"普通", "优秀", "精良", "稀有", "史诗", "传说"};
    // 档次概率权重：普通35%, 优秀28%, 精良20%, 稀有11%, 史诗5%, 传说1%
    private static final int[] TIER_WEIGHTS = {35, 28, 20, 11, 5, 1};
    // 每档基础资质点数范围 [min, max]
    private static final int[][] TIER_POINT_RANGES = {
        {20, 40}, {40, 70}, {70, 110}, {110, 160}, {160, 220}, {220, 300}
    };
    // 每档基础属性范围 [min, max]
    private static final int[][] TIER_STAT_RANGES = {
        {1, 5}, {3, 10}, {6, 18}, {12, 30}, {20, 45}, {35, 70}
    };

    record PetSpecies(String name, String icon, String element, String type) {}

    private final List<PetSpecies> speciesPool = List.of(
        // 火系
        new PetSpecies("火焰狐", "🦊", "fire", "狐"),
        new PetSpecies("熔岩龙", "🐉", "fire", "龙"),
        new PetSpecies("赤焰凤", "🐦‍🔥", "fire", "凤"),
        new PetSpecies("火麒麟", "🔥", "fire", "麒麟"),
        new PetSpecies("炎狮王", "🦁", "fire", "狮"),
        // 冰系
        new PetSpecies("冰霜虎", "🐯", "ice", "虎"),
        new PetSpecies("雪域狼", "🐺", "ice", "狼"),
        new PetSpecies("冰晶蝶", "🦋", "ice", "蝶"),
        new PetSpecies("霜鹿", "🦌", "ice", "鹿"),
        new PetSpecies("寒冰龟", "🐢", "ice", "龟"),
        // 雷系
        new PetSpecies("雷霆鹰", "🦅", "thunder", "鹰"),
        new PetSpecies("闪电豹", "🐆", "thunder", "豹"),
        new PetSpecies("雷麒麟", "⚡", "thunder", "麒麟"),
        new PetSpecies("雷蛟", "🐍", "thunder", "蛟"),
        // 风系
        new PetSpecies("疾风隼", "🐦", "wind", "隼"),
        new PetSpecies("风灵鹤", "🕊️", "wind", "鹤"),
        new PetSpecies("旋风鼠", "🐭", "wind", "鼠"),
        new PetSpecies("云雀", "☁️", "wind", "雀"),
        // 地系
        new PetSpecies("岩甲犀", "🦏", "earth", "犀"),
        new PetSpecies("山岳熊", "🐻", "earth", "熊"),
        new PetSpecies("石魔像", "🗿", "earth", "魔像"),
        new PetSpecies("地穴蛛", "🕷️", "earth", "蛛"),
        // 水系
        new PetSpecies("碧波鲸", "🐋", "water", "鲸"),
        new PetSpecies("灵水蛇", "🐍", "water", "蛇"),
        new PetSpecies("海灵龟", "🐢", "water", "龟"),
        new PetSpecies("潮汐鱼", "🐟", "water", "鱼"),
        // 光系
        new PetSpecies("圣光鹿", "🦄", "light", "鹿"),
        new PetSpecies("光翼天马", "🐴", "light", "天马"),
        new PetSpecies("曙光蝶", "✨", "light", "蝶"),
        new PetSpecies("辉光灵", "💫", "light", "灵"),
        // 暗系
        new PetSpecies("暗影猫", "🐈‍⬛", "dark", "猫"),
        new PetSpecies("幽冥鸦", "🐦‍⬛", "dark", "鸦"),
        new PetSpecies("暗夜蝙蝠", "🦇", "dark", "蝙蝠"),
        new PetSpecies("噬魂蛛", "🕸️", "dark", "蛛")
    );

    @PostConstruct
    private void init() {
        templateList = mongoTemplate.findAll(PetTemplate.class);
        skillTemplateList = mongoTemplate.findAll(PetSkillTemplate.class);
        skillTemplateList.forEach(skillTemplate -> this.skillTemplateMap.put(skillTemplate.getSkill(), skillTemplate));
    }

    public static String getTierName(int tier) {
        return (tier >= 1 && tier <= 6) ? TIER_NAMES[tier - 1] : TIER_NAMES[0];
    }

    private int rollTier() {
        int total = 0;
        for (int w : TIER_WEIGHTS) total += w;
        int roll = ThreadLocalRandom.current().nextInt(total);
        int acc = 0;
        for (int i = 0; i < TIER_WEIGHTS.length; i++) {
            acc += TIER_WEIGHTS[i];
            if (roll < acc) return i + 1;
        }
        return 1;
    }

    private int randRange(int min, int max) {
        return min + ThreadLocalRandom.current().nextInt(max - min + 1);
    }

    public Pet generateTieredPet() {
        int tier = rollTier();
        PetSpecies species = speciesPool.get(ThreadLocalRandom.current().nextInt(speciesPool.size()));
        int[] statRange = TIER_STAT_RANGES[tier - 1];
        int[] pointRange = TIER_POINT_RANGES[tier - 1];

        Pet pet = new Pet();
        pet.setId(new ObjectId().toString());
        pet.setTier(tier);
        pet.setIcon(species.icon());
        pet.setNickname(species.name());
        pet.setPetType(species.type());
        pet.setElement(species.element());
        pet.setConstitution(randRange(statRange[0], statRange[1]));
        pet.setMagicPower(randRange(statRange[0], statRange[1]));
        pet.setPower(randRange(statRange[0], statRange[1]));
        pet.setEndurance(randRange(statRange[0], statRange[1]));
        pet.setAgile(randRange(statRange[0], statRange[1]));
        pet.setPropertyPointNum(randRange(pointRange[0], pointRange[1]));
        pet.setMaxSkill(Math.min(4 + tier, 10));
        pet.setMutationNo(0);
        return pet;
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

    // ── REST 兼容方法（不依赖 FlowContext）──────────────

    public Pet randomPetRest(long userId) {
        PetBag petBag = ofPetBag(userId);
        Pet pet = generateTieredPet();
        petBag.addPet(pet);
        save(petBag);
        return pet;
    }

    public void deletePetRest(long userId, String petId) {
        PetBag petBag = ofPetBag(userId);
        petBag.optionalPet(petId).ifPresent(pet -> {
            petBag.deletePet(petId);
            save(petBag);
        });
    }

    public Pet createPetRest(long userId, CreatePetMessage msg) {
        PetBag petBag = ofPetBag(userId);
        PetTemplate petTemplate = templateList.stream()
            .filter(t -> t.getId().equals(msg.petTemplateId))
            .findFirst()
            .orElse(RandomKit.randomEle(templateList));

        Pet pet = petTemplate.createPet();
        if (msg.nickname != null && !msg.nickname.isEmpty()) {
            pet.setNickname(msg.nickname);
        }
        pet.setAiImageUrl(msg.aiImageUrl);
        pet.setPetType(msg.petType);
        pet.setElement(msg.element);
        pet.setArtStyle(msg.artStyle);

        petBag.addPet(pet);
        save(petBag);
        return pet;
    }
}
