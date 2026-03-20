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
package com.iohao.mmo.client.input;

import com.iohao.game.action.skeleton.protocol.wrapper.LongValue;
import com.iohao.game.external.client.AbstractInputCommandRegion;
import com.iohao.mmo.level.cmd.LevelCmd;
import com.iohao.mmo.level.proto.ExpMessage;
import com.iohao.mmo.level.proto.LevelMessage;
import lombok.extern.slf4j.Slf4j;

/**
 * @author 渔民小镇
 * @date 2023-07-30
 */
@Slf4j
public class LevelInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = LevelCmd.cmd;
        this.inputCommandCreate.cmdName = "等级模块";

        request();
        listen();
    }

    private void listen() {
        ofListen(result -> {
            LevelMessage value = result.getValue(LevelMessage.class);
            log.info("{}", value);
        }, LevelCmd.broadcastLevel, "等级信息更新");
    }

    private void request() {

        ofCommand(LevelCmd.getLevel)
                .setTitle("查询等级信息")
                .setRequestData(() -> LongValue.of(clientUser.getUserId()))
                .callback(result -> {
                    LevelMessage value = result.getValue(LevelMessage.class);
                    log.info("value : {}", value);
                });

        ofCommand(LevelCmd.personAddExp).setTitle("添加玩家经验值").setRequestData(() -> {
            // 给自己添加 10 经验值
            ExpMessage expMessage = new ExpMessage();
            expMessage.id = clientUser.getUserId();
            expMessage.exp = 10;
            return expMessage;
        }).callback(result -> {
            LevelMessage value = result.getValue(LevelMessage.class);
            log.info("value : {}", value);
        });

        ofCommand(LevelCmd.personUpLevel).setTitle("人物升级").setRequestData(() -> {
            // 给自己添加 10 经验值
            ExpMessage expMessage = new ExpMessage();
            expMessage.id = clientUser.getUserId();
            expMessage.exp = 10;
            return expMessage;
        }).callback(result -> {
            LevelMessage value = result.getValue(LevelMessage.class);
            log.info("value : {}", value);
        });
    }
}