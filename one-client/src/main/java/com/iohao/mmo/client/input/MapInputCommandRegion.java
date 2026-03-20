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

import com.iohao.game.common.kit.attr.AttrOption;
import com.iohao.game.external.client.AbstractInputCommandRegion;
import com.iohao.game.external.client.kit.ScannerKit;
import com.iohao.mmo.map.cmd.MapCmd;
import com.iohao.mmo.map.proto.EnterMapMessage;
import com.iohao.mmo.map.proto.EnterMapReq;
import com.iohao.mmo.map.proto.LocationMessage;
import lombok.extern.slf4j.Slf4j;

/**
 * @author 渔民小镇
 * @date 2023-07-27
 */
@Slf4j
public class MapInputCommandRegion extends AbstractInputCommandRegion {

    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = MapCmd.cmd;

        request();
        listen();
    }

    @Override
    public void loginSuccessCallback() {
        ofRequestCommand(MapCmd.enterMap).setRequestData(() -> {
            // 进入地图，根据地图 id
            EnterMapReq enterMapReq = new EnterMapReq();
            enterMapReq.mapId = 1;
            return enterMapReq;
        }).execute();
    }

    private void request() {

        ofCommand(MapCmd.enterMap).callback(result -> {
            EnterMapMessage userInfo = result.getValue(EnterMapMessage.class);
            log.info("enterMapRoom : {}", userInfo);
        }).setTitle("进入地图").setRequestData(() -> {
            ScannerKit.log(() -> log.info("请输入需要到达的地图 mapId"));
            long mapId = ScannerKit.nextLong(1);

            // 请求参数
            EnterMapReq enterMapReq = new EnterMapReq();
            // 进入地图，根据地图 id
            enterMapReq.mapId = mapId;

            return enterMapReq;
        });

        ofCommand(MapCmd.move).callback(result -> {
            LocationMessage value = result.getValue(LocationMessage.class);
            log.info("r玩家移动 : {}", value);

            if (value.playerId == clientUser.getUserId()) {
                // 保存自己的 location
                clientUser.option(InternalAttr.locationMessage, value);
            }
        }).setTitle("玩家移动").setRequestData(() -> {
            // 请求参数
            LocationMessage locationMessage = clientUser.option(InternalAttr.locationMessage);
            locationMessage.x += 10;
            locationMessage.y += 10;
            return locationMessage;
        });
    }

    private void listen() {
        ofListen(result -> {
            LocationMessage value = result.getValue(LocationMessage.class);
            log.info("玩家移动 : {}", value);
        }, MapCmd.move, "玩家移动");
    }

    interface InternalAttr {
        AttrOption<LocationMessage> locationMessage = AttrOption.valueOf("locationMessage", new LocationMessage());
    }
}


