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
package com.iohao.mmo.bag.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.protocol.wrapper.WrapperKit;
import com.iohao.game.common.kit.CollKit;
import com.iohao.mmo.bag.cmd.BagCmd;
import com.iohao.mmo.bag.entity.Bag;
import com.iohao.mmo.bag.entity.BagItem;
import com.iohao.mmo.bag.mapper.BagMapper;
import com.iohao.mmo.bag.mapper.UseItemMapper;
import com.iohao.mmo.bag.pojo.UsePOJO;
import com.iohao.mmo.bag.proto.BagItemMessage;
import com.iohao.mmo.bag.proto.BagMessage;
import com.iohao.mmo.bag.proto.UseMessage;
import com.iohao.mmo.bag.region.SceneConst;
import com.iohao.mmo.bag.region.UseContext;
import com.iohao.mmo.bag.region.UseRegion;
import com.iohao.mmo.bag.service.BagService;
import com.iohao.mmo.common.provide.client.CommonExchange;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 背包
 *
 * @author 渔民小镇
 * @date 2023-08-04
 */
@Slf4j
@Component
@ActionController(BagCmd.cmd)
public class BagAction {
    @Resource
    BagService bagService;
    @Resource
    UseRegion useRegion;

    /**
     * 查询玩家背包
     *
     * @return 背包
     */
    @ActionMethod(BagCmd.bag)
    public BagMessage getBag(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Bag bag = bagService.ofBag(userId);

        return BagMapper.ME.convert(bag);
    }

    /**
     * 往背包添加（增加）多个物品
     *
     * @param bagItemMessages 物品列表
     * @param flowContext     flowContext
     */
    @ActionMethod(BagCmd.incrementItem)
    public void internalIncrementItems(List<BagItemMessage> bagItemMessages, FlowContext flowContext) {

        if (CollKit.isEmpty(bagItemMessages)) {
            return;
        }

        long userId = flowContext.getUserId();
        log.info("往背包添加（增加）多个物品 ，userId:{}", userId);

        // 增加多个物品
        List<BagItem> bagItems = BagMapper.ME.convertBagItems(bagItemMessages);
        bagItems = this.bagService.incrementItems(bagItems, userId);

        // 推送物品变动列表
        List<BagItemMessage> list = BagMapper.ME.convertBagItemMessages(bagItems);
        CmdInfo cmdInfo = BagCmd.of(BagCmd.broadcastChangeItems);
        flowContext.broadcastMe(cmdInfo, WrapperKit.ofListByteValue(list));

        // 物品获得通知
        CommonExchange.broadcastShowItem(() -> BagMapper.ME.convertShowItems(bagItemMessages), flowContext);
    }

    /**
     * 从背包减少物品
     *
     * @param bagItemMessage 物品
     * @param flowContext    flowContext
     * @return 当前物品的最新信息
     */
    @ActionMethod(BagCmd.decrementItem)
    public BagItemMessage internalDecrementItem(BagItemMessage bagItemMessage, FlowContext flowContext) {
        long userId = flowContext.getUserId();

        BagItem bagItem = BagMapper.ME.convert(bagItemMessage);

        bagItem = bagService.decrementItem(bagItem, userId);
        BagMapper.ME.to(bagItem, bagItemMessage);

        return bagItemMessage;
    }

    /**
     * 使用背包物品
     *
     * @param useMessage  使用物品
     * @param flowContext flowContext
     */
    @ActionMethod(BagCmd.use)
    public boolean use(UseMessage useMessage, FlowContext flowContext) {
        useMessage.scene = SceneConst.defaultScene;
        useProcess(useMessage, flowContext);
        return true;
    }

    /**
     * 使用背包物品来打造装备
     *
     * @param useMessage  使用物品
     * @param flowContext flowContext
     */
    @ActionMethod(BagCmd.useBuildEquip)
    public boolean useBuildEquip(UseMessage useMessage, FlowContext flowContext) {
        useMessage.scene = SceneConst.buildEquipScene;
        useProcess(useMessage, flowContext);
        return true;
    }

    private void useProcess(UseMessage useMessage, FlowContext flowContext) {
        ActionErrorEnum.validateErrCode.assertTrue(useMessage.verify());
        /*
         * 各物品的处理逻辑不相同
         * 如气血药，增加气血值；魔法药，增加魔法值；
         * 攻击符、增加临时攻击力；
         */
        UsePOJO usePOJO = UseItemMapper.ME.convert(useMessage);

        // 使用上下文
        UseContext context = new UseContext();
        context.setUsePOJO(usePOJO);
        context.setFlowContext(flowContext);
        context.setScene(usePOJO.scene);
        // 处理物品的使用
        useRegion.process(context);

        log.info("usePOJO : {}", usePOJO);
    }
}
