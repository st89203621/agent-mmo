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
package com.iohao.mmo.bag.client;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.protocol.ResponseMessage;
import com.iohao.game.action.skeleton.protocol.wrapper.ByteValueList;
import com.iohao.game.action.skeleton.protocol.wrapper.WrapperKit;
import com.iohao.game.common.kit.CollKit;
import com.iohao.mmo.bag.cmd.BagCmd;
import com.iohao.mmo.bag.proto.BagItemMessage;
import lombok.experimental.UtilityClass;

import java.util.List;

/**
 * 背包模块，对外提供的访问 api
 *
 * @author 渔民小镇
 * @date 2023-08-06
 */
@UtilityClass
public class BagExchange {
    /**
     * 调用背包模块，增加物品
     *
     * @param bagItemMessageList 背包物品
     * @param flowContext        flowContext
     */
    public void incrementItems(List<BagItemMessage> bagItemMessageList, FlowContext flowContext) {

        if (CollKit.isEmpty(bagItemMessageList)) {
            return;
        }

        CmdInfo cmdInfo = BagCmd.of(BagCmd.incrementItem);
        ByteValueList byteValueList = WrapperKit.ofListByteValue(bagItemMessageList);
        flowContext.invokeModuleVoidMessage(cmdInfo, byteValueList);
    }

    ResponseMessage decrementItemResponse(BagItemMessage bagItemMessage, FlowContext flowContext) {
        CmdInfo cmdInfo = BagCmd.of(BagCmd.decrementItem);

        return flowContext.invokeModuleMessage(cmdInfo, bagItemMessage);
    }
}
