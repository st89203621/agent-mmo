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
package com.iohao.mmo.bag.region.internal;

import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.common.provide.item.ItemTypeIdConst;
import com.iohao.mmo.bag.entity.BagItem;
import com.iohao.mmo.bag.mapper.UseItemMapper;
import com.iohao.mmo.bag.pojo.UseItemPOJO;
import com.iohao.mmo.bag.pojo.UsePOJO;
import com.iohao.mmo.bag.region.SceneConst;
import com.iohao.mmo.bag.region.UseContext;
import com.iohao.mmo.bag.region.UseProcess;
import com.iohao.mmo.bag.service.BagService;
import com.iohao.mmo.level.client.LevelExchange;
import com.iohao.mmo.level.proto.ExpMessage;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 默认的处理物品实现类
 * <pre>
 *     1 将物品从背包中减少
 *     2 执行物品功效
 * </pre>
 *
 * @author 渔民小镇
 * @date 2023-08-06
 */
@Slf4j
@Component
@AllArgsConstructor
public class DefaultUseProcess implements UseProcess {

    final BagService bagService;

    @Override
    public String getScene() {
        return SceneConst.defaultScene;
    }

    @Override
    public void process(UseContext context) {
        UsePOJO usePOJO = context.getUsePOJO();
        Map<String, UseItemPOJO> useItemMap = usePOJO.useItemMap;
        ActionErrorEnum.dataNotExist.assertTrueThrows(useItemMap.isEmpty());

        FlowContext flowContext = context.getFlowContext();
        long userId = flowContext.getUserId();

        UseItemPOJO useItem = usePOJO.getUseItem();

        // 减少物品
        BagItem bagItem = UseItemMapper.ME.convert(useItem);
        bagService.decrementItem(bagItem, userId);

        /*
         * 这里暂时写死，开发者也可以通过 map 映射 itemId 的方式来扩展。
         *
         * 之前计划在第一阶段上规则引擎来做相关业务的，但对于新手来说可能过于复杂了；
         * 由于我们第一阶段的道具内容并不多，使用 if 这样的代码，对于新手来说也更好理解。
         */

        String itemTypeId = useItem.itemTypeId;
        if (ItemTypeIdConst.expId.equals(itemTypeId)) {
            extractedExp(useItem, flowContext);
            return;
        }
    }

    private void extractedExp(UseItemPOJO useItem, FlowContext flowContext) {
        ExpMessage expMessage = new ExpMessage();
        expMessage.id = flowContext.getUserId();
        // 暂时写死
        expMessage.exp = 20 * useItem.quantity;
        // 调用添加经验值 api
        LevelExchange.addExpPerson(expMessage, flowContext);
    }
}
