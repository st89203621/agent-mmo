package com.iohao.mmo.bookworld;

import com.iohao.game.action.skeleton.core.BarSkeleton;
import com.iohao.game.action.skeleton.core.BarSkeletonBuilder;
import com.iohao.game.action.skeleton.ext.spring.ActionFactoryBeanForSpring;
import com.iohao.game.bolt.broker.client.AbstractBrokerClientStartup;
import com.iohao.game.bolt.broker.core.client.BrokerClientBuilder;
import com.iohao.mmo.bookworld.action.BookWorldAction;
import com.iohao.mmo.common.logic.server.LogicServerKit;

/**
 * 书籍世界逻辑服务器
 */
public class BookWorldLogicServer extends AbstractBrokerClientStartup {

    @Override
    public BarSkeleton createBarSkeleton() {
        BarSkeletonBuilder builder = LogicServerKit.createBuilder(BookWorldAction.class);
        builder.setActionFactoryBean(ActionFactoryBeanForSpring.me());
        return builder.build();
    }

    @Override
    public BrokerClientBuilder createBrokerClientBuilder() {
        BrokerClientBuilder builder = LogicServerKit.newBrokerClientBuilder();
        builder.appName("书籍世界逻辑服");
        return builder;
    }
}
