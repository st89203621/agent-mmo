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
import com.iohao.mmo.bag.cmd.ItemCmd;
import com.iohao.mmo.bag.proto.ItemMessage;
import com.iohao.mmo.client.common.item.ItemTypeNodeKit;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-08-15
 */
@Slf4j
public class ItemInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = ItemCmd.cmd;

        ofCommand(ItemCmd.listItem).callback(result -> {
            List<ItemMessage> list = result.listValue(ItemMessage.class);
            list.forEach(itemMessage -> ItemTypeNodeKit.add(itemMessage.itemTypeId, itemMessage.name, itemMessage.description));
        }).setTitle("物品配置列表");
    }

    @Override
    public void loginSuccessCallback() {
        ofRequestCommand(ItemCmd.listItem).execute();
    }
}