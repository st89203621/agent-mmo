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
package com.iohao.mmo.common.provide.item;

import lombok.Getter;

/**
 * 物品大类
 *
 * @author 渔民小镇
 * @date 2023-08-08
 */
@Getter
public enum ItemTypeConst {
    /** 装备 */
    EQUIP("equip"),
    /** 铁 */
    IRON("iron"),
    /** 宠物（宝宝） */
    PET("pet"),
    /** 宠物（宝宝）技能 */
    PET_SKILL("petSkill"),
    ;

    final String value;

    ItemTypeConst(String value) {
        this.value = value;
    }

    public String of(String itemTypeId) {
        return this.value + "_" + itemTypeId;
    }
}
