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
package com.iohao.mmo.companion.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;

/**
 * 灵侣模块命令
 *
 * @author 渔民小镇
 * @date 2025-10-15
 */
public interface CompanionCmd {
    int cmd = 15;
    
    /** 获取灵侣列表 */
    int listCompanion = 0;
    
    /** 招募灵侣 */
    int recruitCompanion = 1;
    
    /** 设置队伍 */
    int setTeam = 2;
    
    /** 更新灵侣形象 */
    int updateAvatar = 3;
    
    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}

