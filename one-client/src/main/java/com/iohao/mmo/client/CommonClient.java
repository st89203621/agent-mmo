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
package com.iohao.mmo.client;

import com.iohao.game.external.client.InputCommandRegion;
import com.iohao.game.external.client.join.ClientRunOne;
import com.iohao.game.external.client.user.ClientUser;
import com.iohao.game.external.client.user.DefaultClientUser;
import com.iohao.game.external.core.config.ExternalJoinEnum;
import com.iohao.mmo.client.input.*;
import com.iohao.mmo.common.config.MyGlobalSetting;

import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-07-21
 */
public class CommonClient {
    static void start(long userId) {
        extractedConfig();

        // 客户端的用户（玩家）
        ClientUser clientUser = new DefaultClientUser();
        clientUser.setJwt(String.valueOf(userId));

        List<InputCommandRegion> inputCommandRegions = listInputCommandRegion();

        // 启动模拟客户端
        new ClientRunOne()
                .setClientUser(clientUser)
                .setInputCommandRegions(inputCommandRegions)
                .setJoinEnum(ExternalJoinEnum.WEBSOCKET)
                .startup();
    }

    private static void extractedConfig() {
        // 统一的默认配置
        MyGlobalSetting.defaultSetting();
    }

    private static List<InputCommandRegion> listInputCommandRegion() {
        // 登录
        LoginInputCommandRegion loginInputCommandRegion = new LoginInputCommandRegion();
        // 通用的
        CommonInputCommandRegion commonInputCommandRegion = new CommonInputCommandRegion();
        // 地图
        MapInputCommandRegion mapInputCommandRegion = new MapInputCommandRegion();
        // 人物、英雄
        PersonInputCommandRegion personInputCommandRegion = new PersonInputCommandRegion();
        // 等级相关
        LevelInputCommandRegion levelInputCommandRegion = new LevelInputCommandRegion();
        // 背包
        BagInputCommandRegion bagInputCommandRegion = new BagInputCommandRegion();
        // 物品
        ItemInputCommandRegion itemInputCommandRegion = new ItemInputCommandRegion();
        // 邮件
        MailInputCommandRegion mailInputCommandRegion = new MailInputCommandRegion();
        // 宠物宝宝
        PetInputCommandRegion petInputCommandRegion = new PetInputCommandRegion();
        //装备
        EquipInputCommandRegion equipInputCommandRegion = new EquipInputCommandRegion();
        // 礼包码
        GiftCodeInputCommandRegion giftCodeInputCommandRegion = new GiftCodeInputCommandRegion();

        // 模拟请求数据
        return List.of(
                loginInputCommandRegion
                , commonInputCommandRegion
//                , mapInputCommandRegion
//                , personInputCommandRegion
//                , levelInputCommandRegion
                , itemInputCommandRegion
                , bagInputCommandRegion
                , mailInputCommandRegion
//                , petInputCommandRegion
//                , equipInputCommandRegion
                , giftCodeInputCommandRegion
        );
    }


}
