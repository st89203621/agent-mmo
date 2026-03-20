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
package com.iohao.mmo.pet.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * @author 渔民小镇
 * @date 2023-08-29
 */
public interface PetCmd {
    int cmd = CmdModule.petCmd;
    /** 宠物模板 */
    int listPetTemplate = 1;
    /** 宠物查询 */
    int listPet = 2;
    /** 孵化，得到一个宠物宝宝 */
    int boomEgg = 3;
    /** 更新宝宝属性 */
    int updatePetProperty = 4;
    /** 宝宝打技能 */
    int enhancePetSkill = 5;
    /** 宝宝技能列表 */
    int listPetSkillTemplate = 6;

    /** 删除宝宝 */
    int deletePet = 7;

    /** AI生成宠物图片 */
    int generatePetImage = 8;

    /** 创建宠物（带形象） */
    int createPet = 9;

    /** 更新宠物形象 */
    int updatePetImage = 10;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
