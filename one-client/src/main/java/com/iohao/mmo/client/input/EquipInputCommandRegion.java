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

import com.iohao.game.action.skeleton.protocol.wrapper.StringValue;
import com.iohao.game.action.skeleton.protocol.wrapper.WrapperKit;
import com.iohao.game.external.client.AbstractInputCommandRegion;
import com.iohao.game.external.client.kit.ScannerKit;
import com.iohao.game.external.client.kit.SplitParam;
import com.iohao.mmo.common.provide.kit.JsonKit;
import com.iohao.mmo.equip.cmd.EquipCmd;
import com.iohao.mmo.equip.proto.ElseEquipPropertyMessage;
import com.iohao.mmo.equip.proto.EquipMessage;
import com.iohao.mmo.equip.proto.EquipResetMessage;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.List;

/**
 * @author 唐斌
 * @date 2023-07-30
 */
@Slf4j
public class EquipInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = EquipCmd.cmd;
        this.inputCommandCreate.cmdName = "装备模块";

        request();

        listen();
    }

    private void listen() {

    }

    private void request() {

        // 10-1 获取装备列表信息
        ofCommand(EquipCmd.getEquipList).setTitle("获取装备列表信息").callback(result -> {
            List<EquipMessage> value = result.listValue(EquipMessage.class);
            log.info("装备列表信息 : {}", JsonKit.toJsonString(value));
        });

        // 10-2 查询装备信息
        ofCommand(EquipCmd.getEquip).setTitle("查询装备信息").setRequestData(() -> {
            ScannerKit.log(() -> log.info("请输入要查询的装备id"));
            String id = ScannerKit.nextLine();

            // 请求参数
            return StringValue.of(id);
        }).callback(result -> {
            EquipMessage value = result.getValue(EquipMessage.class);
            log.info("装备信息 : {}", value);
        });

        // 10-3 分配装备属性信息
        ofCommand(EquipCmd.allotEquip).setTitle("分配装备属性信息").setRequestData(() -> {
            ScannerKit.log(() -> log.info("请输入装备id"));
            String id = ScannerKit.nextLine();
            ScannerKit.log(() -> log.info("请输入体质、魔力、力量、耐力、敏捷，格式[体质-魔力-力量-耐力-敏捷]"));
            String inputValue = ScannerKit.nextLine("1-1-1-1-1");
            SplitParam param = new SplitParam(inputValue);
            int constitution = param.getInt(0, 0);
            int magicPower = param.getInt(1, 0);
            int power = param.getInt(2, 0);
            int endurance = param.getInt(3, 0);
            int agile = param.getInt(4, 0);

            ElseEquipPropertyMessage elseEquipPropertyMessage =
                    new ElseEquipPropertyMessage(constitution, magicPower, power, endurance, agile);
            EquipMessage equipMessage = new EquipMessage();
            equipMessage.elseEquipProperty = elseEquipPropertyMessage;
            equipMessage.id = id;
            return equipMessage;
        }).callback(result -> {
            EquipMessage value = result.getValue(EquipMessage.class);
            log.info("装备属性信息 : {}", value);
        });

        // 10-4 重新随机总属性点（鉴定装备）
        ofCommand(EquipCmd.resetEquip).setTitle("重新随机总属性点（鉴定装备）").setRequestData(() -> {
            ScannerKit.log(() -> log.info("请输入装备id和极品概率增益百分比,格式 [装备id-增益百分比]"));
            String inputValue = ScannerKit.nextLine("1-0.3");
            SplitParam param = new SplitParam(inputValue);
            String id = param.getString(0);
            String excellentRateString = param.getString(1);

            EquipResetMessage equipResetMessage = new EquipResetMessage();
            equipResetMessage.id = id;
            equipResetMessage.excellentRateString = excellentRateString;
            return equipResetMessage;
        }).callback(result -> {
            EquipMessage value = result.getValue(EquipMessage.class);
            log.info("装备属性信息 : {}", value);
        });


        // 10-5 批量删除装备

        ofCommand(EquipCmd.delEquipBatch).setTitle("批量删除装备").setRequestData(() -> {
            ScannerKit.log(() -> log.info("请输入要删除的装备id,格式 [装备1id-装备2id]"));
            String ids = ScannerKit.nextLine("1-1");

            List<String> idList = Arrays.asList(ids.split("-"));

            // 请求参数
            return WrapperKit.ofListStringValue(idList);
        }).callback(result -> {
            EquipMessage value = result.getValue(EquipMessage.class);
            log.info("装备属性信息 : {}", value);
        });

        // 10-13 根据装备库列表批量随机新的装备
        ofCommand(EquipCmd.randomEquip).setTitle("根据装备库列表批量随机新的装备").setRequestData(() -> {
            ScannerKit.log(() -> log.info(
                    "请输入装备库itemTypeId列表,格式 [装备库itemTypeId1-装备库itemTypeId2-装备库itemTypeId3...]"));
            String itemTypeIds = ScannerKit.nextLine("1-1");

            List<String> itemTypeIdList = Arrays.asList(itemTypeIds.split("-"));

            // 请求参数
            return WrapperKit.ofListStringValue(itemTypeIdList);
        }).callback(result -> {
            List<EquipMessage> value = result.listValue(EquipMessage.class);
            log.info("装备列表信息 : {}", JsonKit.toJsonString(value));
        });

    }
}
