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
package com.iohao.mmo.mail;

import com.iohao.game.action.skeleton.core.BarSkeleton;
import com.iohao.game.action.skeleton.core.BarSkeletonBuilder;
import com.iohao.game.action.skeleton.core.doc.BroadcastDocument;
import com.iohao.game.bolt.broker.client.AbstractBrokerClientStartup;
import com.iohao.game.bolt.broker.core.client.BrokerClientBuilder;
import com.iohao.mmo.common.logic.server.LogicServerKit;
import com.iohao.mmo.level.cmd.LevelCmd;
import com.iohao.mmo.level.proto.LevelMessage;
import com.iohao.mmo.mail.action.MailAction;
import com.iohao.mmo.mail.cmd.MailCmd;
import com.iohao.mmo.mail.proto.MailMessage;

/**
 * @author 渔民小镇
 * @date 2023-08-15
 */
public class MailLogicServer extends AbstractBrokerClientStartup {
    @Override
    public BarSkeleton createBarSkeleton() {
        // 业务框架构建器
        BarSkeletonBuilder builder = LogicServerKit
                .createBuilder(MailAction.class);

        extractedDoc(builder);

        return builder.build();
    }

    @Override
    public BrokerClientBuilder createBrokerClientBuilder() {
        BrokerClientBuilder builder = LogicServerKit.newBrokerClientBuilder();
        builder.appName("邮件逻辑服");
        return builder;
    }

    private void extractedDoc(BarSkeletonBuilder builder) {
        builder.addBroadcastDocument(BroadcastDocument.newBuilder(MailCmd.of(MailCmd.broadcastNewMail))
                .setDataClass(MailMessage.class)
                .setMethodName("broadcastNewMail")
                .setMethodDescription("新邮件")
        );
    }
}