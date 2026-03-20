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
package com.iohao.mmo.external;

import com.iohao.game.bolt.broker.core.client.BrokerAddress;
import com.iohao.game.bolt.broker.core.common.IoGameGlobalConfig;
import com.iohao.game.external.core.ExternalServer;
import com.iohao.game.external.core.broker.client.ext.ExternalBizRegions;
import com.iohao.game.external.core.config.ExternalGlobalConfig;
import com.iohao.game.external.core.config.ExternalJoinEnum;
import com.iohao.game.external.core.netty.DefaultExternalServer;
import com.iohao.game.external.core.netty.DefaultExternalServerBuilder;
import com.iohao.mmo.common.config.MyGlobalSetting;
import com.iohao.mmo.external.core.broker.client.ext.impl.UserIpExternalBizRegion;
import com.iohao.mmo.login.cmd.LoginCmd;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * @author 渔民小镇
 * @date 2023-07-21
 */
public class MyExternalServer {

    public List<ExternalServer> listExternalServer(int externalPort) {
        // webSocket
        ExternalServer externalServer = createExternalServer(externalPort);
        // tcp
        ExternalServer tcpExternalServer = createTcpExternalServer(ExternalJoinEnum.TCP.cocPort(externalPort));

        return List.of(externalServer, tcpExternalServer);
    }

    public ExternalServer createExternalServer(int externalPort) {
        // 游戏对外服配置
        extractedConfig();

        // 游戏对外服 - 构建器
        DefaultExternalServerBuilder builder = DefaultExternalServer.newBuilder(externalPort)
                // websocket 方式连接；如果不设置，默认也是这个配置
                .externalJoinEnum(ExternalJoinEnum.WEBSOCKET)
                // Broker （游戏网关）的连接地址；如果不设置，默认也是这个配置
                .brokerAddress(new BrokerAddress("127.0.0.1", IoGameGlobalConfig.brokerPort));

        // 配置服务器绑定到所有网络接口，支持移动端访问
        // 注意：ioGame框架默认已经绑定到0.0.0.0，无需额外配置

//        builder.setting().setMicroBootstrapFlow(new WebSocketMicroBootstrapFlow() {
//            @Override
//            protected void httpHandler(PipelineContext context) {
//                super.httpHandler(context);
//                /*
//                 * HttpRealIpHandler 是框架内置的一个 handler。
//                 * 添加上后，即使是通过 nginx 转发，也可以得到玩家真实的 ip
//                 */
//                context.addLast("HttpRealIpHandler", new HttpRealIpHandler());
//            }
//        });

        // 构建游戏对外服 https://www.yuque.com/iohao/game/ea6geg
        return builder.build();
    }

    public ExternalServer createTcpExternalServer(int externalPort) {
        // 游戏对外服配置
        extractedConfig();

        // 游戏对外服 - 构建器
        DefaultExternalServerBuilder builder = DefaultExternalServer.newBuilder(externalPort)
                // websocket 方式连接；如果不设置，默认也是这个配置
                .externalJoinEnum(ExternalJoinEnum.TCP)
                // Broker （游戏网关）的连接地址；如果不设置，默认也是这个配置
                .brokerAddress(new BrokerAddress("127.0.0.1", IoGameGlobalConfig.brokerPort));

        // 构建游戏对外服 https://www.yuque.com/iohao/game/ea6geg
        return builder.build();
    }

    AtomicBoolean extractedConfigFlag = new AtomicBoolean();

    private void extractedConfig() {
        // true 表示开启 traceId 特性。（开启全链路调用日志跟踪特性）
        // 参考 https://www.yuque.com/iohao/game/zurusq#bmLMA
        IoGameGlobalConfig.openTraceId = true;

        if (extractedConfigFlag.get() || !extractedConfigFlag.compareAndSet(false, true)) {
            return;
        }

        // 统一的默认配置
        MyGlobalSetting.defaultSetting();

        // 对外服业务扩展
        extractedExternalBizRegion();

        // 路由访问权限控制
        extractedAccess();
    }

    private static void extractedExternalBizRegion() {
        ExternalBizRegions.add(new UserIpExternalBizRegion());
    }

    private static void extractedAccess() {
        // https://www.yuque.com/iohao/game/nap5y8p5fevhv99y

        var accessAuthenticationHook = ExternalGlobalConfig.accessAuthenticationHook;
        // 表示登录才能访问业务方法
        accessAuthenticationHook.setVerifyIdentity(true);
        // 添加不需要登录（身份验证）也能访问的业务方法 (action)
        accessAuthenticationHook.addIgnoreAuthCmd(LoginCmd.cmd, LoginCmd.loginVerify);
        accessAuthenticationHook.addIgnoreAuthCmd(LoginCmd.cmd, LoginCmd.register);
    }

    public static void main(String[] args) {
        // 游戏对外服端口
        ExternalServer externalServer = new MyExternalServer()
                .createExternalServer(ExternalGlobalConfig.externalPort);

        externalServer.startup();
    }
}
