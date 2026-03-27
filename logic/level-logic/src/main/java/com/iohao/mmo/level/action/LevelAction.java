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
package com.iohao.mmo.level.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.level.cmd.LevelCmd;
import com.iohao.mmo.level.entity.Level;
import com.iohao.mmo.level.mapper.LevelMapper;
import com.iohao.mmo.level.proto.ExpMessage;
import com.iohao.mmo.level.proto.LevelMessage;
import com.iohao.mmo.level.service.LevelService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * @author 渔民小镇
 * @date 2023-07-30
 */
@Slf4j
@Component
@ActionController(LevelCmd.cmd)
public class LevelAction {
    @Resource
    LevelService levelService;

    /**
     * 经验值添加（内部调用），自动检查升级
     *
     * @param expMessage 经验值
     */
    @ActionMethod(LevelCmd.personAddExp)
    public void internalAddExpPerson(ExpMessage expMessage, FlowContext flowContext) {
        Level level = levelService.addExpWithAutoLevelUp(expMessage.id, expMessage.exp);

        // 广播最新等级信息给玩家
        LevelMessage levelMessage = LevelMapper.ME.convert(level);
        CmdInfo cmdInfo = LevelCmd.of(LevelCmd.broadcastLevel);
        flowContext.broadcastMe(cmdInfo, levelMessage);
    }

    /**
     * 得到等级信息
     *
     * @param id id
     * @return LevelMessage
     */
    @ActionMethod(LevelCmd.ofLevel)
    public LevelMessage internalOfLevel(long id) {
        Level level = levelService.ofLevel(id);
        return LevelMapper.ME.convert(level);
    }

    /**
     * 查询等级信息
     *
     * @param id id
     * @return 等级信息
     */
    @ActionMethod(LevelCmd.getLevel)
    public LevelMessage getLevel(long id) {
        Optional<Level> levelOptional = levelService.getById(id);

        ActionErrorEnum.dataNotExist.assertTrueThrows(levelOptional.isEmpty());

        return levelOptional
                .map(LevelMapper.ME::convert)
                .orElseThrow();
    }

}