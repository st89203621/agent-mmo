package com.iohao.mmo.guild;

import com.iohao.game.action.skeleton.core.BarSkeleton;
import com.iohao.game.action.skeleton.core.BarSkeletonBuilder;
import com.iohao.game.bolt.broker.client.AbstractBrokerClientStartup;
import com.iohao.game.bolt.broker.core.client.BrokerClientBuilder;
import com.iohao.mmo.common.logic.server.LogicServerKit;
import com.iohao.mmo.guild.action.GuildAction;

public class GuildLogicServer extends AbstractBrokerClientStartup {
    @Override
    public BarSkeleton createBarSkeleton() {
        BarSkeletonBuilder builder = LogicServerKit.createBuilder(GuildAction.class);
        return builder.build();
    }

    @Override
    public BrokerClientBuilder createBrokerClientBuilder() {
        BrokerClientBuilder builder = LogicServerKit.newBrokerClientBuilder();
        builder.appName("盟会逻辑服");
        return builder;
    }
}
