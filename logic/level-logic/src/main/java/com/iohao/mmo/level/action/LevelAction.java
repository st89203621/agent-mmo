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
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.level.cmd.LevelCmd;
import com.iohao.mmo.level.entity.Level;
import com.iohao.mmo.level.entity.PersonLevelConfig;
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
     * 经验值添加
     *
     * @param expMessage 经验值
     */
    @ActionMethod(LevelCmd.personAddExp)
    public void internalAddExpPerson(ExpMessage expMessage, FlowContext flowContext) {
        // internal 打头的方法名表示内部方法，只能由内部调用
        long userId = expMessage.id;
        int exp = expMessage.exp;

        Level level = levelService.ofLevel(userId);
        level.addExp(exp);
        levelService.save(level);

        // 推送经验值给玩家
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

    /**
     * 玩家手动点升级，升级后会恢复各种状态
     *
     * @param flowContext flowContext
     * @return 等级信息
     */
    @ActionMethod(LevelCmd.personUpLevel)
    public LevelMessage upLevelPerson(FlowContext flowContext) {
        long userId = flowContext.getUserId();

        Level level = levelService.ofLevel(userId);
        PersonLevelConfig personLevelConfig = levelService.getPersonLevelConfigByLevel(level.getLevel());

        // 检测经验是否足够
        int configExp = personLevelConfig.getExp();
        long exp = level.getExp();
        GameCode.upLevelError.assertTrue(exp >= configExp);

        //  达到升级条件
        level.addExp(-configExp);
        level.incrementLevel();
        levelService.save(level);
        // TODO: 将来添加恢复状态相关业务
        return LevelMapper.ME.convert(level);
    }
}