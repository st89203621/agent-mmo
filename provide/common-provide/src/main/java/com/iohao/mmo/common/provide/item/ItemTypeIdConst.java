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

/**
 * 物品类型 id - itemTypeId
 *
 * @author 渔民小镇
 * @date 2023-08-06
 */
public interface ItemTypeIdConst {
    String expId = "exp";
    String hpId = "hp";
    /** 装备 - 武器书 - 10 级 */
    String equipWeaponBook10 = ItemTypeConst.EQUIP.of("weapon_book_10");
    /** 铁 - 10 级 */
    String iron10 = ItemTypeConst.IRON.of("10");
    /** 装备 - 武器 - 10 级 */
    String equipWeapon10 = ItemTypeConst.EQUIP.of("weapon_10");
    /** 装备 - 衣服 - 10 级 */
    String equipClothing10 = ItemTypeConst.EQUIP.of("clothing_10");
    /** 宠物（宝宝）蛋 ，孵化后可随机得到宝宝 */
    String petEgg = "petEgg";
    String petTianBing = ItemTypeConst.PET.of("tianBing");
    String petGuiJiang = ItemTypeConst.PET.of("guiJiang");

    /** 宝宝技能：必杀 */
    String petSkill_BiSha = ItemTypeConst.PET_SKILL.of("biSha");
    /** 宝宝技能：善恶有报 */
    String petSkill_ShanEYouBao = ItemTypeConst.PET_SKILL.of("shanEYouBao");
}
