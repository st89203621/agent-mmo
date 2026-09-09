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
package com.iohao.mmo.pet.config;

import com.iohao.mmo.common.provide.item.ItemTypeIdConst;
import com.iohao.mmo.pet.entity.PetSkillTemplate;
import com.iohao.mmo.pet.entity.PetTemplate;
import com.iohao.mmo.pet.entity.PetTransformationTemplate;
import lombok.AllArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-08-29
 */
@Component
@AllArgsConstructor
public class PetCommandLineRunner implements CommandLineRunner {
    final MongoTemplate mongoTemplate;
    final List<PetTemplate> petTemplateList = new ArrayList<>();
    final List<PetSkillTemplate> petSkillTemplates = new ArrayList<>();

    @Override
    public void run(String... args) {
        initConfigExcel();
    }

    private void initConfigExcel() {
        mongoTemplate.dropCollection(PetTemplate.class);
        mongoTemplate.dropCollection(PetSkillTemplate.class);

        extractedTianBing();
        extractedGuiJiang();
        mongoTemplate.insert(petTemplateList, PetTemplate.class);

        extractedSkill();
        mongoTemplate.insert(petSkillTemplates, PetSkillTemplate.class);
    }

    private void extractedSkill() {
        PetSkillTemplate skillTemplate = new PetSkillTemplate();
        petSkillTemplates.add(skillTemplate);
        skillTemplate.setSkill(ItemTypeIdConst.petSkill_BiSha);
        skillTemplate.setName("必杀");
        skillTemplate.setDescription("发起物理攻击时，物理暴击几率增加20%。");

        skillTemplate = new PetSkillTemplate();
        petSkillTemplates.add(skillTemplate);
        skillTemplate.setSkill(ItemTypeIdConst.petSkill_ShanEYouBao);
        skillTemplate.setName("善恶有报");
        skillTemplate.setDescription("攻击时有较大概率造成双倍伤害，有较小概率给对方回复一定气血");
    }

    private void extractedTianBing() {
        PetTemplate petTemplate = ofPetTemplate(ItemTypeIdConst.petTianBing, "天兵");
        petTemplateList.add(petTemplate);

        petTemplate.setDescription("天庭的神兵");
        petTemplate.addTransformation(of("天兵-初级形态", 0));
        petTemplate.addTransformation(of("天兵-高级形态", 1));
    }

    private void extractedGuiJiang() {
        PetTemplate petTemplate = ofPetTemplate(ItemTypeIdConst.petGuiJiang, "鬼将");
        petTemplateList.add(petTemplate);

        petTemplate.setDescription("冥界的鬼将");
        petTemplate.addTransformation(of("鬼将-初级形态", 0));
        petTemplate.addTransformation(of("鬼将-高级形态", 1));
    }

    private PetTemplate ofPetTemplate(String id, String name) {
        PetTemplate template = new PetTemplate();
        template.setId(id);
        template.setName(name);
        return template;
    }

    private PetTransformationTemplate of(String name, int no) {
        PetTransformationTemplate transformation = new PetTransformationTemplate();
        transformation.setMutationName(name);
        transformation.setMutationNo(no);
        transformation.setMutationSkin("skin_" + transformation.getMutationNo());

        transformation.setPropertyPointNum((no + 1) * 50);

        return transformation;
    }
}
