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
package com.iohao.mmo.map.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * @author 渔民小镇
 * @date 2023-07-27
 */
public interface MapCmd {
    int cmd = CmdModule.mapCmd;
    /** 进入地图 */
    int enterMap = 1;
    /** 移动（自由坐标） */
    int move = 2;
    /** 获取当前区域信息 */
    int getZoneInfo = 3;
    /** 移动到相邻区域 */
    int moveToZone = 4;
    /** 获取附近玩家 */
    int getNearbyPlayers = 5;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}
