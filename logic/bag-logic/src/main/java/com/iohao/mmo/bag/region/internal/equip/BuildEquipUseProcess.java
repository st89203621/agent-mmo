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
package com.iohao.mmo.bag.region.internal.equip;

import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.bag.entity.BagItem;
import com.iohao.mmo.bag.mapper.UseItemMapper;
import com.iohao.mmo.bag.pojo.UseItemPOJO;
import com.iohao.mmo.bag.pojo.UsePOJO;
import com.iohao.mmo.bag.region.SceneConst;
import com.iohao.mmo.bag.region.UseContext;
import com.iohao.mmo.bag.region.UseProcess;
import com.iohao.mmo.bag.service.BagService;
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.equip.client.EquipExchange;
import com.iohao.mmo.equip.proto.CreateEquipMessage;
import com.iohao.mmo.equip.proto.NewEquipMessage;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 打造装备 - 物品使用逻辑处理类
 * <pre>
 *     1. 将物品从背包中减少（打造书、打造材料）
 *     2. 调用装备模块的 【打造装备 action】，得到新的装备 id。
 *     3. 将装备 id 关联到背包物品中。
 * </pre>
 *
 * @author 渔民小镇
 * @date 2023-08-08
 */
@Slf4j
@Component
@AllArgsConstructor
public class BuildEquipUseProcess implements UseProcess {
    final BagService bagService;

    @Override
    public String getScene() {
        return SceneConst.buildEquipScene;
    }

    @Override
    public void process(UseContext context) {
        UsePOJO usePOJO = context.getUsePOJO();
        Map<String, UseItemPOJO> useItemMap = usePOJO.useItemMap;
        ActionErrorEnum.dataNotExist.assertTrueThrows(useItemMap.isEmpty());
        FlowContext flowContext = context.getFlowContext();
        long userId = flowContext.getUserId();

        // 校验物品合法性
        BuildEquipParse buildEquipParse = new BuildEquipParse(useItemMap);
        buildEquipParse.verify();

        // 物品数量检测
        List<BagItem> bagItems = UseItemMapper.ME.convertToBagItem(useItemMap.values());
        boolean contains = bagService.contains(bagItems, userId);
        GameCode.quantityNotEnough.assertTrue(contains);

        // 减少背包的物品
        for (BagItem bagItem : bagItems) {
            bagService.decrementItem(bagItem, userId);
        }

        // 调用【装备模块】的打造 api
        BuildEquipParse.BuildParam equipBuildParam = buildEquipParse.getEquipBuildParam();
        BagItem equip = createEquip(equipBuildParam, flowContext);

        // 将新装备添加到背包中
        bagService.incrementItem(equip, userId);
    }

    private BagItem createEquip(BuildEquipParse.BuildParam buildParam, FlowContext flowContext) {
        // 得到对应装备的 itemTypeId
        String equipItemTypeId = buildParam.getEquipItemTypeId();

        CreateEquipMessage createEquipMessage = new CreateEquipMessage();
        createEquipMessage.itemTypeId = equipItemTypeId;

        NewEquipMessage newEquipMessage = EquipExchange.createEquip(createEquipMessage, flowContext);
        //TODO 这里需要做异常判断，有可能找不到对应的装备库导致创建装备失败
        newEquipMessage = tempNewEquipMessage(createEquipMessage, newEquipMessage);

        String equipId = newEquipMessage.equipId;

        // 将新装备放到背包中
        BagItem bagItem = new BagItem();
        bagItem.setId(equipId);
        bagItem.setItemTypeId(equipItemTypeId);
        bagItem.setQuantity(1);

        return bagItem;
    }

    private NewEquipMessage tempNewEquipMessage(CreateEquipMessage createEquipMessage, NewEquipMessage newEquipMessage) {
        // 临时代码
        if (Objects.isNull(newEquipMessage)) {
            String newEquipId = createEquipMessage.itemTypeId + "_" + LocalTime.now().getMinute() + "_" + new ObjectId();
            newEquipMessage = new NewEquipMessage();
            newEquipMessage.equipId = newEquipId;
            newEquipMessage.itemTypeId = createEquipMessage.itemTypeId;
        }

        return newEquipMessage;
    }
}
