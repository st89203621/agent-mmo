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
package com.iohao.mmo.equip.entity;

import com.iohao.mmo.common.kit.RandomKit;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 装备固定属性
 * <pre>
 *     装备的基本属性
 * </pre>
 *
 * @author 唐斌
 * @date 2023-07-24
 */
@Data
@Builder
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FixedEquipProperty {
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

    public static FixedEquipProperty randomFixed(FixedEquipProperty fixedEquipPropertyMin,
                                                 FixedEquipProperty fixedEquipPropertyMax){
        if(fixedEquipPropertyMin==null || fixedEquipPropertyMax == null)
            return FixedEquipProperty.builder().build();
        return FixedEquipProperty.builder()
                .hp(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getHp(),
                                fixedEquipPropertyMax.getHp()))
                .mp(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getMp(),
                                fixedEquipPropertyMax.getMp()))
                .physicsAttack(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getPhysicsAttack(),
                                fixedEquipPropertyMax.getPhysicsAttack()))
                .physicsDefense(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getPhysicsDefense(),
                                fixedEquipPropertyMax.getMagicDefense()))
                .magicAttack(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getMagicAttack(),
                                fixedEquipPropertyMax.getMagicAttack()))
                .magicDefense(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getMagicDefense(),
                                fixedEquipPropertyMax.getMagicDefense()))
                .treatAttack(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getTreatAttack(),
                                fixedEquipPropertyMax.getTreatAttack()))
                .sealAttack(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getSealAttack(),
                                fixedEquipPropertyMax.getSealAttack()))
                .sealDefense(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getSealDefense(),
                                fixedEquipPropertyMax.getSealDefense()))
                .speed(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getSpeed(),
                                fixedEquipPropertyMax.getSpeed()))
                .anger(
                        RandomKit.randomFromInt(fixedEquipPropertyMin.getAnger(),
                                fixedEquipPropertyMax.getAnger()))
                .build();
    }
}
