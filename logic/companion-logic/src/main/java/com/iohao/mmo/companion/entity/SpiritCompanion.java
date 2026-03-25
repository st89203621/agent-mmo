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
package com.iohao.mmo.companion.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 灵侣实体
 *
 * @author 渔民小镇
 * @date 2025-10-15
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SpiritCompanion {
    @Id
    String id;
    
    /** 灵侣模板ID */
    String companionId;
    
    /** 灵侣名称 */
    String name;
    
    /** 七界类型 */
    String realm;
    
    /** 职业类型 */
    String type;
    
    /** 品质 */
    String quality;
    
    /** 等级 */
    int level;
    
    /** 经验值 */
    int exp;
    
    /** 羁绊等级 */
    int bondLevel;
    
    /** 羁绊经验 */
    int bondExp;
    
    /** 当前HP */
    int currentHp;
    
    /** 最大HP */
    int maxHp;
    
    /** 攻击力 */
    int atk;
    
    /** 防御力 */
    int def;
    
    /** 速度 */
    int spd;
    
    /** AI生成的形象URL */
    String avatarUrl;

    /** 立绘图片ID（对应SceneImage） */
    String portraitImageId;
    
    /** 形象风格 */
    String avatarStyle;
    
    /** 是否已装备形象 */
    boolean avatarEquipped;
}

