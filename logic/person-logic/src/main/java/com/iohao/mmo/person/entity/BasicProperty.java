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
package com.iohao.mmo.person.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Objects;

/**
 * 额外属性
 * <pre>
 *     人物的基本属性、英雄的基本属性
 * </pre>
 *
 * @author 渔民小镇
 * @date 2023-07-24
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BasicProperty {
    @Id
    String id;
    /** 生命值 */
    int hp;
    /** 魔法值 */
    int mp;
    /** 物理攻击 */
    int physicsAttack;
    /** 物理防御 */
    int physicsDefense;
    /** 魔法攻击 */
    int magicAttack;
    /** 魔法防御 */
    int magicDefense;
    /** 治疗强度 */
    int treatAttack;
    /** 封印强度 */
    int sealAttack;
    /** 封印防御（抵抗封印） */
    int sealDefense;
    /** 速度 */
    int speed;
    /** 怒气 */
    int anger;
    /** 附加攻击（由敏捷决定） */
    int bonusAttack;
    /** 附加防御（由敏捷决定） */
    int bonusDefense;
    /** 敏捷（决定附加攻防和暴击） */
    int agility;
    /** 暴击率（百分比，如15表示15%） */
    int critRate;

    public BasicProperty plus(BasicProperty other) {
        BasicProperty result = new BasicProperty();

        if (Objects.isNull(other)) {
            return this;
        }

        result.hp = this.hp + other.hp;
        result.mp = this.mp + other.mp;
        result.physicsAttack = this.physicsAttack + other.physicsAttack;
        result.physicsDefense = this.physicsDefense + other.physicsDefense;
        result.magicAttack = this.magicAttack + other.magicAttack;
        result.magicDefense = this.magicDefense + other.magicDefense;
        result.treatAttack = this.treatAttack + other.treatAttack;
        result.sealAttack = this.sealAttack + other.sealAttack;
        result.sealDefense = this.sealDefense + other.sealDefense;
        result.speed = this.speed + other.speed;
        result.anger = this.anger + other.anger;
        result.bonusAttack = this.bonusAttack + other.bonusAttack;
        result.bonusDefense = this.bonusDefense + other.bonusDefense;
        result.agility = this.agility + other.agility;
        result.critRate = this.critRate + other.critRate;

        return result;
    }

    /** 根据敏捷计算附加属性 */
    public void recalcBonus() {
        this.bonusAttack = this.agility * 2;
        this.bonusDefense = (int) (this.agility * 1.5);
        this.critRate = Math.min(this.agility / 5, 80);
    }
}
