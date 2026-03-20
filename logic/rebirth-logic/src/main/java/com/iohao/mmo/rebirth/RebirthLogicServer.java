package com.iohao.mmo.rebirth;

import com.iohao.game.action.skeleton.core.BarSkeleton;
import com.iohao.game.action.skeleton.core.BarSkeletonBuilder;
import com.iohao.game.action.skeleton.ext.spring.ActionFactoryBeanForSpring;
import com.iohao.game.bolt.broker.client.AbstractBrokerClientStartup;
import com.iohao.game.bolt.broker.core.client.BrokerClientBuilder;
import com.iohao.mmo.common.logic.server.LogicServerKit;
import com.iohao.mmo.rebirth.action.RebirthAction;

/**
 * 七世轮回逻辑服务器
 */
public class RebirthLogicServer extends AbstractBrokerClientStartup {

    @Override
    public BarSkeleton createBarSkeleton() {
        BarSkeletonBuilder builder = LogicServerKit.createBuilder(RebirthAction.class);
        builder.setActionFactoryBean(ActionFactoryBeanForSpring.me());
        return builder.build();
    }

    @Override
    public BrokerClientBuilder createBrokerClientBuilder() {
        BrokerClientBuilder builder = LogicServerKit.newBrokerClientBuilder();
        builder.appName("七世轮回逻辑服");
        return builder;
    }
}
