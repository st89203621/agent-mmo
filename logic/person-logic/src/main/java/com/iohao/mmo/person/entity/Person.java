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

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-07-24
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Person {
    @Id
    long id;
    /** 玩家名称 */
    String name;
    /** 职业：ATTACK(无坚不摧) / DEFENSE(金刚护体) / AGILITY(行动敏捷) */
    String profession;
    /** 基本属性 */
    BasicProperty basicProperty;
    /** 英雄列表 */
    @DocumentReference
    List<Hero> heroList;
    /** 当前使用的英雄 */
    Hero currentHero;
    /** 性别: male / female */
    String gender;
    /** 外貌特征描述（发型+服饰等） */
    String features;
    /** AI生成的角色立绘图片ID（对应SceneImage） */
    String portraitImageId;
    /** AI生成的主页背景图片ID（对应SceneImage） */
    String bgImageId;
    /** 未分配的属性点（每升一级获得5点） */
    int attributePoints;
}
