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
package com.iohao.mmo.client.input;

import com.alibaba.fastjson2.JSONObject;
import com.iohao.game.common.kit.RandomKit;
import com.iohao.game.external.client.AbstractInputCommandRegion;
import com.iohao.game.external.client.kit.ScannerKit;
import com.iohao.mmo.common.provide.kit.JsonKit;
import com.iohao.mmo.pet.cmd.PetCmd;
import com.iohao.mmo.pet.proto.PetMessage;
import com.iohao.mmo.pet.proto.PetSkillTemplateMessage;
import com.iohao.mmo.pet.proto.PetTemplateMessage;
import com.iohao.mmo.pet.proto.UpdatePetPropertyMessage;
import com.iohao.mmo.pet.proto.internal.EnhancePetSkillMessage;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * @author 渔民小镇
 * @date 2024-02-06
 */
@Slf4j
public class PetInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = PetCmd.cmd;
        this.inputCommandCreate.cmdName = "宝宝";

        this.ofCommand(PetCmd.listPetTemplate).callback(result -> {
            List<PetTemplateMessage> list = result.listValue(PetTemplateMessage.class);
            list.forEach(InternalPetKit::add);
        }).setTitle("系统宠物（宝宝）模板列表");

        this.ofCommand(PetCmd.listPet).callback(result -> {
            List<JSONObject> jsonList = result
                    .listValue(PetMessage.class)
                    .stream()
                    .map(InternalPetKit::toJSON)
                    .toList();

            log.info("玩家的宠物（宝宝）列表 : {}", JsonKit.toJsonString(jsonList));
        }).setTitle("玩家的宠物（宝宝）列表");

        this.ofCommand(PetCmd.boomEgg).setTitle("内部方法 - 随机得到一个宝宝");

        this.ofCommand(PetCmd.updatePetProperty).callback(result -> {
            PetMessage value = result.getValue(PetMessage.class);
            JSONObject json = InternalPetKit.toJSON(value);
            log.info("更新后的宝宝信息 : {}", JsonKit.toJsonString(json));
        }).setRequestData(() -> {
            ScannerKit.log(() -> log.info("请输入需要更新的宝宝 id"));
            // 方便起见，这里随机分配
            String petId = ScannerKit.nextLine("1");

            UpdatePetPropertyMessage message = new UpdatePetPropertyMessage();
            message.petId = petId;
            message.constitution = RandomKit.randomInt(10);
            message.magicPower = RandomKit.randomInt(10);
            message.power = RandomKit.randomInt(10);
            message.endurance = RandomKit.randomInt(10);
            message.agile = RandomKit.randomInt(10);

            return message;
        }).setTitle("更新宝宝属性");

        this.ofCommand(PetCmd.enhancePetSkill).callback(result -> {
            PetMessage value = result.getValue(PetMessage.class);
            JSONObject json = InternalPetKit.toJSON(value);
            log.info("更新后的宝宝信息 : {}", JsonKit.toJsonString(json));
        }).setRequestData(() -> {
            ScannerKit.log(() -> log.info("请输入需要更新的宝宝 id"));
            // 方便起见，这里随机分配
            String petId = ScannerKit.nextLine("1");

            EnhancePetSkillMessage skillMessage = new EnhancePetSkillMessage();
            skillMessage.petId = petId;
            skillMessage.index = 100;
            skillMessage.skill = InternalPetKit.randomSkill();
            log.info("skillMessage : {}", skillMessage);

            return skillMessage;
        }).setTitle("宝宝打技能");

        this.ofCommand(PetCmd.listPetSkillTemplate).callback(result -> {
            List<PetSkillTemplateMessage> list = result.listValue(PetSkillTemplateMessage.class);
            list.forEach(InternalPetKit::add);
        }).setTitle("宝宝技能模板列表");
    }

    @Override
    public void loginSuccessCallback() {
        this.ofRequestCommand(PetCmd.listPetTemplate).execute();
        this.ofRequestCommand(PetCmd.listPetSkillTemplate).execute();
    }
}