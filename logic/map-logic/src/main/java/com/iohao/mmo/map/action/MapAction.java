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
package com.iohao.mmo.map.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.widget.light.room.flow.GameFlowContext;
import com.iohao.mmo.common.core.flow.MyFlowContext;
import com.iohao.mmo.map.cmd.MapCmd;
import com.iohao.mmo.map.mapper.MapMapper;
import com.iohao.mmo.map.proto.EnterMapMessage;
import com.iohao.mmo.map.proto.EnterMapReq;
import com.iohao.mmo.map.proto.LocationMessage;
import com.iohao.mmo.map.room.*;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Optional;

/**
 * 地图
 *
 * @author 渔民小镇
 * @date 2023-07-27
 */
@Slf4j
@Component
@ActionController(MapCmd.cmd)
public class MapAction {
    @Resource
    MapRoomService roomService;

    private MapRoom getMapRoom() {
        // 模拟地图
        final long roomId = 1;
        MapRoom room = roomService.getRoom(roomId);

        // 如果房间（地图）不存在，就创建
        return Optional.ofNullable(room).orElseGet(() -> {
            // 因为整体比较简单，所以我们不需要任何参数
            var theRoom = roomService.createRoom(null);
            theRoom.setRoomId(roomId);

            // 将房间保存到房间管理器中
            this.roomService.addRoom(theRoom);

            return theRoom;
        });
    }

    /**
     * 玩家进入地图
     *
     * @param enterMapReq 进入地图
     * @param flowContext flowContext
     * @return 地图信息
     */
    @ActionMethod(MapCmd.enterMap)
    public EnterMapMessage enterMap(EnterMapReq enterMapReq, MyFlowContext flowContext) {
        MapRoom room = getMapRoom();

        GameFlowContext gameFlowContext = GameFlowContext.of(room, flowContext);
        this.roomService.enterRoom(gameFlowContext);

        long userId = flowContext.getUserId();

        // 初始化玩家位置
        room.ifPlayerExist(userId, (MapPlayer player) -> {
            if (player.getLocation() == null) {
                Location location = new Location();
                location.setX(200);
                location.setY(450);
                location.setPlayerId(userId);
                player.setLocation(location);
            }
        });

        EnterMapMessage enterMapMessage = new EnterMapMessage();
        enterMapMessage.mapId = room.getRoomId();
        Collection<MapPlayer> players = room.listPlayer();
        enterMapMessage.players = MapMapper.ME.convertList(players);

        return enterMapMessage;
    }

    /**
     * 玩家在地图内移动
     *
     * @param locationMessage 玩家位置移动
     * @param flowContext     flowContext
     */
    @ActionMethod(MapCmd.move)
    public void move(LocationMessage locationMessage, FlowContext flowContext) {
        /*
         * 为了方便演示与新手理解，这里暂时做成实时移动。
         *
         * 后续版本改为定时更新玩家位置.
         */

        long userId = flowContext.getUserId();
        locationMessage.playerId = userId;

        MapRoom room = getMapRoom();

        room.ifPlayerExist(userId, (MapPlayer player) -> {
            // 更新最后一次移动的位置信息
            Location location = player.getLocation();
            MapMapper.ME.to(locationMessage, location);

            // 房间内广播玩家移动
            room.ofRangeBroadcast()
                    .setResponseMessage(flowContext.getCmdInfo(), locationMessage)
                    .execute();
        });
    }
}
