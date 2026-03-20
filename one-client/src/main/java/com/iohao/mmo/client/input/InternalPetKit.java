/*
 * ioGame
 * Copyright (C) 2021 - 2024  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
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
package com.iohao.mmo.client.input;

import com.alibaba.fastjson2.JSONObject;
import com.iohao.game.common.kit.RandomKit;
import com.iohao.mmo.common.provide.kit.JsonKit;
import com.iohao.mmo.pet.proto.PetMessage;
import com.iohao.mmo.pet.proto.PetSkillTemplateMessage;
import com.iohao.mmo.pet.proto.PetTemplateMessage;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import lombok.experimental.UtilityClass;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * @author 渔民小镇
 * @date 2024-02-06
 */
@UtilityClass
class InternalPetKit {
    Map<String, PetTemplateMessage> map = new HashMap<>();
    Map<String, PetSkillTemplateMessage> skillMap = new HashMap<>();

    void add(PetTemplateMessage petTemplateMessage) {
        map.put(petTemplateMessage.id, petTemplateMessage);
    }

    void add(PetSkillTemplateMessage skillTemplateMessage) {
        skillMap.put(skillTemplateMessage.skill, skillTemplateMessage);
    }

    String randomSkill() {
        List<PetSkillTemplateMessage> list = skillMap.values().stream().toList();
        PetSkillTemplateMessage skillTemplateMessage = RandomKit.randomEle(list);
        return skillTemplateMessage.skill;
    }

    JSONObject toJSON(String petTemplateId) {
        var config = map.get(petTemplateId);
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("宝宝类型", config.name);
        jsonObject.put("宝宝描述", config.description);
        return jsonObject;
    }

    public JSONObject toJSON(PetMessage petMessage) {
        JSONObject json = new JSONObject();
        json.put("id", petMessage.id);
        json.put("昵称", petMessage.nickname);
        json.put("形态模型", petMessage.mutationSkin);

        int propertyPointNum = petMessage.propertyPointNum;
        propertyPointNum -= (petMessage.constitution
                + petMessage.magicPower
                + petMessage.power
                + petMessage.endurance
                + petMessage.agile
        );

        json.put("潜力", propertyPointNum);
        json.put("体质", petMessage.constitution);
        json.put("魔力", petMessage.magicPower);
        json.put("力量", petMessage.power);
        json.put("耐力", petMessage.endurance);
        json.put("敏捷", petMessage.agile);
        json.put("技能上限", petMessage.maxSkill);

        extractedSkill(petMessage, json);

        String petTemplateId = petMessage.petTemplateId;
        JSONObject templateJson = toJSON(petTemplateId);
        return JsonKit.merge(templateJson, json);
    }

    private void extractedSkill(PetMessage petMessage, JSONObject json) {
        if (Objects.isNull(petMessage.skillMap)) {
            json.put("技能", "[]");
            return;
        }

        List<JSONObject> skills = petMessage.skillMap
                .values()
                .stream()
                .map(petSkillMessage -> {
                    PetSkillTemplateMessage skill = skillMap.get(petSkillMessage.skill);

                    JSONObject skillJson = new JSONObject();
                    skillJson.put("index", petSkillMessage.index);
                    skillJson.put("技能", skill.name);
                    skillJson.put("描述", skill.description);

                    return skillJson;
                }).toList();

        json.put("技能", skills);
    }
}