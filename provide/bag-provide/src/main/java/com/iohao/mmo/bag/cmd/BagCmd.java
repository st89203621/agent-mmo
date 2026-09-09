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
package com.iohao.mmo.bag.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * 背包
 *
 * @author 渔民小镇
 * @date 2023-08-04
 */
public interface BagCmd {
    int cmd = CmdModule.bagCmd;
    /** 背包列表 */
    int bag = 1;
    /** 添加物品 */
    int incrementItem = 2;
    /** 减少物品 */
    int decrementItem = 3;
    /** 使用物品 */
    int use = 5;
    /** 打造装备 */
    int useBuildEquip = 6;

    /** 推送物品变更 */
    int broadcastChangeItems = 50;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
