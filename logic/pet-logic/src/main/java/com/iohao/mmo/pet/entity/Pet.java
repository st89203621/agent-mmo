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

import com.iohao.game.common.kit.RandomKit;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

/**
 * @author 渔民小镇
 * @date 2023-08-29
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Pet {
    @Id
    String id;
    /** 所属宠物 */
    String petTemplateId;
    /** 昵称 */
    String nickname;
    /** 进化经验值 */
    int mutationExp;

    /** 形态变化的编号 */
    int mutationNo;
    /** 当前使用的形态模型 */
    String mutationSkin;
    /** 可分配的属性点数量 */
    int propertyPointNum;

    /** 档次 1-6 (1=普通, 2=优秀, 3=精良, 4=稀有, 5=史诗, 6=传说) */
    int tier;
    /** 宠物图标 */
    String icon;

    /** 体质 */
    int constitution;
    /** 魔力 */
    int magicPower;
    /** 力量 */
    int power;
    /** 耐力 */
    int endurance;
    /** 敏捷 */
    int agile;

    Map<Integer, PetSkill> skillMap;
    /** 最大技能数量上限 */
    int maxSkill;

    /** AI生成的宠物形象URL */
    String aiImageUrl;
    /** 宠物种类 (dragon, phoenix等) */
    String petType;
    /** 元素属性 (fire, ice等) */
    String element;
    /** 艺术风格 (3D, 2D等) */
    String artStyle;
    /** 立绘图片ID（对应SceneImage） */
    String portraitImageId;

    public void addSkill(PetSkill petSkill) {
        int index = petSkill.getIndex();
        if (index >= maxSkill) {
            index = RandomKit.randomInt(maxSkill);
            petSkill.setIndex(index);
        }

        if (Objects.isNull(this.skillMap)) {
            this.skillMap = new TreeMap<>();
        }

        this.skillMap.put(index, petSkill);
    }

    public void verifyProperty() {
        boolean result = this.propertyPointNum >= (
                this.constitution
                        + this.magicPower
                        + this.power
                        + this.endurance
                        + this.agile
        );

        if (!result) {
            this.constitution = 0;
            this.magicPower = 0;
            this.power = 0;
            this.endurance = 0;
            this.agile = 0;
        }
    }

    public void incrementMutationExp() {
        this.mutationExp++;
    }
}
