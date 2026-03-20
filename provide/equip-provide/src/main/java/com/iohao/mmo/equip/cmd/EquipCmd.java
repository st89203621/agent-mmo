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
package com.iohao.mmo.equip.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * @author 唐斌
 * @date 2023-07-30
 * @description:
 */
public interface EquipCmd {
    int cmd = CmdModule.equipCmd;
    /** 得到装备列表 */
    int getEquipList = 1;
    /** 得到装备信息 */
    int getEquip = 2;
    /** 分配属性点 */
    int allotEquip = 3;
    /** 重新随机总属性点（鉴定装备） */
    int resetEquip = 4;
    /** 批量删除装备 */
    int delEquipBatch = 5;
    /** 获取装备库信息 */
    int getEquipTemplate = 12;
    /** 根据装备库随机出一件新的装备 */
    int randomEquip = 13;
    /** 通过材料直接创建新装备 */
    int createEquip = 14;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
