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

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 装备
 *
 * @author 唐斌
 * @date 2023-07-26
 */
@Data
@Builder
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Equip {
    @Id
    String id;
    /** itemTypeId */
    String itemTypeId;
    /** 玩家 */
    long userId;
    /** 总属性点 */
    int attrTotal;
    /** 未分配属性点 */
    int undistributedAttr;
    /** 部位（0帽子，1衣服，2武器，3手镯，4裤子，5鞋子） */
    int position;
    /** 要求等级 */
    int level;
    /** 鉴定次数 */
    int identifyCount;
    /** 装备固定属性最小值 */
    FixedEquipProperty fixedEquipPropertyMin;
    /** 装备固定属性最大值 */
    FixedEquipProperty fixedEquipPropertyMax;
    /** 装备固定属性 */
    FixedEquipProperty fixedEquipProperty;
    /** 品质 1普通，2极品*/
    int quality;
    /** 加品等级（0-21），35级后可加品，每级提升装备属性 */
    int grade;
    /** 鬼炉品质（0-30），21级以上装备可通过鬼炉提升 */
    int furnaceGrade;
    /** 自定义属性随机范围最小值 */
    int totalAttrMin;
    /** 自定义属性随机范围最大值 */
    int totalAttrMax;
    /** 装备库id */
    String equipTemplateId;
    /** 额外属性 */
    ElseEquipProperty elseEquipProperty;
}
