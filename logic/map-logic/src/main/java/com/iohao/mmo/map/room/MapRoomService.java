/*
 * ioGame
 * Copyright (C) 2021 - present  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
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
package com.iohao.mmo.map.room;

import com.iohao.game.widget.light.room.Room;
import com.iohao.game.widget.light.room.RoomService;
import com.iohao.game.widget.light.room.flow.GameFixedService;
import com.iohao.game.widget.light.room.flow.GameFlowContext;
import com.iohao.game.widget.light.room.flow.RoomCreateContext;
import com.iohao.mmo.common.core.flow.MyFlowContext;
import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 地图
 *
 * @author 渔民小镇
 * @date 2024-05-15
 */
@Getter
@Setter
@Service
public class MapRoomService implements RoomService, GameFixedService {
    // 房间 map
    final Map<Long, Room> roomMap = new ConcurrentHashMap<>();
    // 玩家对应的房间 map
    final Map<Long, Long> userRoomMap = new ConcurrentHashMap<>();

    @Override
    public MapRoom createRoom(RoomCreateContext createContext) {
        // 模拟地图
        MapRoom room = new MapRoom();
        room.setRoomId(1);

        return room;
    }

    @Override
    public MapPlayer createPlayer(GameFlowContext gameFlowContext) {
        MyFlowContext flowContext = (MyFlowContext) gameFlowContext.getFlowContext();
        long userId = gameFlowContext.getUserId();
        String nickname = flowContext.getAttachment().nickname;

        Location location = new Location();
        location.setPlayerId(userId);

        MapPlayer player = new MapPlayer();
        player.setUserId(userId);
        player.setNickname(nickname);
        player.setLocation(location);

        return player;
    }

    @Override
    public void enterRoom(GameFlowContext gameFlowContext) {
        long userId = gameFlowContext.getUserId();
        Room room = gameFlowContext.getRoom();

        room.ifPlayerNotExist(userId, () -> {
            // 创建玩家
            MapPlayer player = this.createPlayer(gameFlowContext);
            // 将玩家加入房间
            this.addPlayer(room, player);
        });
    }
}
