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
package com.iohao.mmo.common.logic.server;

import com.iohao.game.action.skeleton.core.BarSkeletonBuilder;
import com.iohao.game.action.skeleton.core.BarSkeletonBuilderParamConfig;
import com.iohao.game.action.skeleton.core.flow.internal.TraceIdInOut;
import com.iohao.game.action.skeleton.kit.LogicServerCreateKit;
import com.iohao.game.bolt.broker.core.client.BrokerClient;
import com.iohao.game.bolt.broker.core.client.BrokerClientBuilder;
import com.iohao.game.bolt.broker.core.common.processor.hook.ClientProcessorHooks;
import com.iohao.mmo.common.config.MyGlobalSetting;
import com.iohao.mmo.common.core.flow.MyFlowContext;
import com.iohao.mmo.common.core.flow.internal.DebugActionAfter;
import com.iohao.mmo.common.core.flow.internal.DebugActionMethodExceptionProcess;
import com.iohao.mmo.common.processor.hook.MyRequestMessageClientProcessorHook;
import lombok.experimental.UtilityClass;

/**
 * @author 渔民小镇
 * @date 2023-07-24
 */
@UtilityClass
public class LogicServerKit {
    public BarSkeletonBuilder createBuilder(Class<?> actionControllerClass) {
        // 业务框架构建器 配置
        var config = new BarSkeletonBuilderParamConfig()
                // 扫描 action 类所在包
                .scanActionPackage(actionControllerClass);

        BarSkeletonBuilder builder = LogicServerCreateKit.createBuilder(config);

        // 重写业务框架 ActionAfter
        builder.setActionAfter(new DebugActionAfter());
        // 重写业务框架 ActionMethodExceptionProcess
        builder.setActionMethodExceptionProcess(new DebugActionMethodExceptionProcess());

        // 使用自定义 FlowContext
        builder.setFlowContextFactory(MyFlowContext::new);

        // 将全链路调用日志跟踪插件 TraceIdInOut 添加到业务框架中
        // 全链路调用日志跟踪特性。文档 https://www.yuque.com/iohao/game/zurusq#bmLMA
        TraceIdInOut traceIdInOut = new TraceIdInOut();
        builder.addInOut(traceIdInOut);

        return builder;
    }

    public BrokerClientBuilder newBrokerClientBuilder() {
        // 统一的默认配置
        MyGlobalSetting.defaultSetting();

        ClientProcessorHooks hooks = ofClientProcessorHooks();
        return BrokerClient.newBuilder()
                .clientProcessorHooks(hooks);
    }

    private ClientProcessorHooks ofClientProcessorHooks() {
        ClientProcessorHooks hooks = new ClientProcessorHooks();
        hooks.setRequestMessageClientProcessorHook(new MyRequestMessageClientProcessorHook());
        return hooks;
    }
}
