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
package com.iohao.mmo.bag;

import com.iohao.game.action.skeleton.core.BarSkeleton;
import com.iohao.game.action.skeleton.core.BarSkeletonBuilder;
import com.iohao.game.action.skeleton.core.doc.BroadcastDocument;
import com.iohao.game.bolt.broker.client.AbstractBrokerClientStartup;
import com.iohao.game.bolt.broker.core.client.BrokerClientBuilder;
import com.iohao.mmo.bag.action.BagAction;
import com.iohao.mmo.bag.cmd.BagCmd;
import com.iohao.mmo.bag.proto.BagItemMessage;
import com.iohao.mmo.common.logic.server.LogicServerKit;

/**
 * @author 渔民小镇
 * @date 2023-08-04
 */
public class BagLogicServer extends AbstractBrokerClientStartup {
    @Override
    public BarSkeleton createBarSkeleton() {
        // 业务框架构建器
        BarSkeletonBuilder builder = LogicServerKit
                .createBuilder(BagAction.class);

        extractedDoc(builder);

        return builder.build();
    }

    @Override
    public BrokerClientBuilder createBrokerClientBuilder() {
        BrokerClientBuilder builder = LogicServerKit.newBrokerClientBuilder();
        builder.appName("背包逻辑服");
        return builder;
    }

    private void extractedDoc(BarSkeletonBuilder builder) {
        
        builder.addBroadcastDocument(BroadcastDocument.newBuilder(BagCmd.of(BagCmd.broadcastChangeItems))
                .setDataClassList(BagItemMessage.class)
                .setMethodName("broadcastChangeItems")
                .setMethodDescription("推送物品变更")
        );
    }
}