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
package com.iohao.mmo.common.provide.client;

import com.iohao.game.action.skeleton.core.BarMessageKit;
import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.commumication.BroadcastContext;
import com.iohao.game.action.skeleton.core.commumication.InvokeModuleContext;
import com.iohao.game.action.skeleton.protocol.RequestMessage;
import com.iohao.game.bolt.broker.core.client.BrokerClientHelper;
import lombok.experimental.UtilityClass;

/**
 * @author 渔民小镇
 * @date 2023-08-06
 */
@UtilityClass
public class ExchangeKit {

    public void invokeModuleVoidMessage(CmdInfo cmdInfo, Object data, long userId) {
        RequestMessage requestMessage = BarMessageKit.createRequestMessage(cmdInfo, data);
        requestMessage.getHeadMetadata().setUserId(userId);

        InvokeModuleContext invokeModuleContext = BrokerClientHelper.getInvokeModuleContext();
        invokeModuleContext.invokeModuleVoidMessage(requestMessage);
    }

    public void broadcast(CmdInfo cmdInfo, Object data, long userId) {
        BroadcastContext broadcastContext = BrokerClientHelper.getBroadcastContext();
        broadcastContext.broadcast(cmdInfo, data, userId);
    }
}
