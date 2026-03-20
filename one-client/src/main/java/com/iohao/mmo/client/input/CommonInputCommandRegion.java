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
import com.iohao.mmo.client.common.item.ItemTypeNode;
import com.iohao.mmo.client.common.item.ItemTypeNodeKit;
import com.iohao.mmo.common.provide.cmd.CommonCmd;
import com.iohao.mmo.common.provide.proto.ShowItemMessage;
import lombok.extern.slf4j.Slf4j;

import java.util.stream.Collectors;

/**
 * @author 渔民小镇
 * @date 2023-08-15
 */
@Slf4j
public class CommonInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = CommonCmd.cmd;

        ofListen(result -> {
            String collect = result.listValue(ShowItemMessage.class)
                    .stream()
                    .map(this::convert)
                    .map(ItemTypeNodeKit::toString)
                    .collect(Collectors.joining());

            log.info("获得新物品 {}", collect);

        }, CommonCmd.broadcastShowItem, "获得新物品");
    }

    ItemTypeNode convert(ShowItemMessage showItemMessage) {
        return new ItemTypeNode(showItemMessage.itemTypeId, showItemMessage.quantity);
    }
}