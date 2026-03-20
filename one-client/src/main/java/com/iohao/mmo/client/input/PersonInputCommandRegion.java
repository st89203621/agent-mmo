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

import com.iohao.game.external.client.AbstractInputCommandRegion;
import com.iohao.mmo.common.provide.kit.JsonKit;
import com.iohao.mmo.person.cmd.PersonCmd;
import com.iohao.mmo.person.proto.PersonMessage;
import lombok.extern.slf4j.Slf4j;

/**
 * @author 渔民小镇
 * @date 2023-07-29
 */
@Slf4j
public class PersonInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = PersonCmd.cmd;

        ofCommand(PersonCmd.getPerson).callback(result -> {
            PersonMessage value = result.getValue(PersonMessage.class);
            String jsonFormat = JsonKit.toJsonString(value);
            log.info("人物信息 : {}", jsonFormat);
        }).setTitle("得到人物、英雄信息");

    }
}
