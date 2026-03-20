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

import com.alibaba.fastjson2.JSONObject;
import com.iohao.game.action.skeleton.protocol.wrapper.WrapperKit;
import com.iohao.game.external.client.AbstractInputCommandRegion;
import com.iohao.game.external.client.kit.ScannerKit;
import com.iohao.game.external.client.kit.SplitParam;
import com.iohao.mmo.bag.cmd.BagCmd;
import com.iohao.mmo.bag.proto.BagItemMessage;
import com.iohao.mmo.bag.proto.BagMessage;
import com.iohao.mmo.bag.proto.UseItemMessage;
import com.iohao.mmo.bag.proto.UseMessage;
import com.iohao.mmo.client.common.item.ItemTypeNodeKit;
import com.iohao.mmo.common.provide.item.ItemTypeIdConst;
import com.iohao.mmo.common.provide.kit.JsonKit;
import com.iohao.mmo.common.snow.SnowKit;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-08-04
 */
@Slf4j
public class BagInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = BagCmd.cmd;
        this.inputCommandCreate.cmdName = "背包模块";

        request();
        useRequest();

        ofListen(result -> {
            List<BagItemMessage> list = result.listValue(BagItemMessage.class);
            log.info("物品变更 : {}", list.size());
        }, BagCmd.broadcastChangeItems, "接收广播-物品变更");
    }

    @Override
    public void loginSuccessCallback() {

        if (true) {
            return;
        }

        List<BagItemMessage> list = new ArrayList<>();
        // 添加一些经验值道具
        BagItemMessage bagItemMessage = BagInternalHelper.ofBagItemMessage(ItemTypeIdConst.expId);
        bagItemMessage.quantity = 10;
        list.add(bagItemMessage);
        log.info("添加 {} 个经验值道具 {}", bagItemMessage.quantity, bagItemMessage);

        // 添加一些装备制造书材料
        bagItemMessage = BagInternalHelper.ofBagItemMessage(ItemTypeIdConst.equipWeaponBook10);
        bagItemMessage.quantity = 1;
        list.add(bagItemMessage);
        log.info("添加 {} 【装备-武器】制造书材料 {}", bagItemMessage.quantity, bagItemMessage);

        // 添加一些装备制造书材料
        bagItemMessage = BagInternalHelper.ofBagItemMessage(ItemTypeIdConst.iron10);
        bagItemMessage.quantity = 1;
        list.add(bagItemMessage);
        log.info("添加 {} 装备-制造材料-铁 {}", bagItemMessage.quantity, bagItemMessage);

        ofRequestCommand(BagCmd.incrementItem)
                .setRequestData(() -> WrapperKit.ofListByteValue(list))
                .execute();
    }

    private void request() {
        ofCommand(BagCmd.bag).setTitle("查询玩家背包").callback(result -> {

            BagMessage value = result.getValue(BagMessage.class);

            List<JSONObject> list = value.itemMap.values().stream().map(bagItemMessage -> {
                String itemTypeId = bagItemMessage.itemTypeId;
                JSONObject bagItemMessageJson = JsonKit.toJSON(bagItemMessage);
                JSONObject itemMessageJson = ItemTypeNodeKit.toJSON(itemTypeId);
                return JsonKit.merge(bagItemMessageJson, itemMessageJson);
            }).toList();

            log.info("查询玩家背包 {}", JsonKit.toJsonString(list));
        });

        ofCommand(BagCmd.incrementItem).setTitle("往背包添加（增加）物品").setRequestData(() -> {
            ScannerKit.log(() -> log.info("输入【1】表示添加一个可叠加的物品。"));
            String inputType = ScannerKit.nextLine("1");

            String id = "1";
            String itemId = "1";

            if (!"1".equals(inputType)) {
                id = SnowKit.nextToString();
            }

            BagItemMessage bagItemMessage = new BagItemMessage();
            bagItemMessage.id = id;
            bagItemMessage.itemTypeId = itemId;
            bagItemMessage.quantity = 1;

            ScannerKit.log(() -> log.info("{}", bagItemMessage));

            // 将请求参数包装成 list
            return WrapperKit.ofListByteValue(List.of(bagItemMessage));
        }).callback(result -> {
            var value = result.getValue(BagItemMessage.class);
            log.info("value : {}", value);
            // 重新查询一次背包
            ofRequestCommand(BagCmd.bag).execute();
        });

        ofCommand(BagCmd.decrementItem).setTitle("从背包减少物品").setRequestData(() -> {
            ScannerKit.log(() -> log.info("输入需要减少的物品信息，格式 [背包物品id-数量]"));
            String inputType = ScannerKit.nextLine("1-1");

            SplitParam param = new SplitParam(inputType);
            String id = param.getString(0);
            int quantity = param.getInt(1, 1);

            BagItemMessage bagItemMessage = new BagItemMessage();
            bagItemMessage.id = id;
            bagItemMessage.quantity = quantity;

            ScannerKit.log(() -> log.info("{}", bagItemMessage));

            return bagItemMessage;
        }).callback(result -> {
            var value = result.getValue(BagItemMessage.class);
            log.info("value : {}", value);

            // 重新查询一次背包
            ofRequestCommand(BagCmd.bag).execute();
        });
    }

    private void useRequest() {

        ofCommand(BagCmd.use).callback(result -> {
            var value = result.getBoolean();
            log.info("value : {}", value);
        }).setTitle("使用背包物品").setRequestData(() -> {
            UseMessage useMessage = new UseMessage();
            useMessage.useItems = sceneDefault();
            ScannerKit.log(() -> log.info("当前所使用的物品信息 : {}", JsonKit.toJsonString(useMessage)));
            return useMessage;
        });

        ofCommand(BagCmd.useBuildEquip).callback(result -> {
            var value = result.getBoolean();
            log.info("value : {}", value);
        }).setTitle("打造装备").setRequestData(() -> {
            UseMessage useMessage = new UseMessage();
            useMessage.useItems = sceneBuildEquip();
            ScannerKit.log(() -> log.info("打造装备-所使用物品 : {}", JsonKit.toJsonString(useMessage)));
            return useMessage;
        });
    }

    private List<UseItemMessage> sceneBuildEquip() {
        ScannerKit.log(() -> {
            log.info("装备的制造最少需要使用两样背包物品，1.装备制造书、2.装备制造材料");
            log.info("格式 [制造书物品id-制造铁物品id]");
        });

        String defaultValue = ItemTypeIdConst.equipWeaponBook10 + "-" + ItemTypeIdConst.iron10;
        String inputType = defaultValue;
//         inputType = ScannerKit.nextLine(defaultValue);
        SplitParam param = new SplitParam(inputType);

        String equipWeaponBook = param.getString(0, ItemTypeIdConst.equipWeaponBook10);
        UseItemMessage useItemMessageEquip = BagInternalHelper.ofUseItemMessage(equipWeaponBook);

        String iron = param.getString(1, ItemTypeIdConst.iron10);
        UseItemMessage useItemMessageIron = BagInternalHelper.ofUseItemMessage(iron);

        return List.of(useItemMessageEquip, useItemMessageIron);
    }

    private List<UseItemMessage> sceneDefault() {
        ScannerKit.log(() -> log.info("输入需要使用的背包物品，格式 [背包物品id-数量]"));
        String inputType = ScannerKit.nextLine("1-1");
        SplitParam param = new SplitParam(inputType);
        // 得到下标 0 的值
        String id = param.getString(0);
        // 得到下标 1 的值，如果值不存在，则使用默认的 1 代替
        int quantity = param.getInt(1, 1);

        var useItemMessage = BagInternalHelper.ofUseItemMessage(id);
        useItemMessage.quantity = quantity;

        return List.of(useItemMessage);
    }
}