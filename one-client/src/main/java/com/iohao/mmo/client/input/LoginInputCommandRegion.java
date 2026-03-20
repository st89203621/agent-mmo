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
package com.iohao.mmo.client.input;

import com.iohao.game.common.kit.StrKit;
import com.iohao.game.common.kit.concurrent.TaskKit;
import com.iohao.game.external.client.AbstractInputCommandRegion;
import com.iohao.game.external.client.kit.AssertKit;
import com.iohao.mmo.login.cmd.LoginCmd;
import com.iohao.mmo.login.proto.LoginVerify;
import com.iohao.mmo.login.proto.RegisterRequest;
import com.iohao.mmo.login.proto.RegisterResponse;
import com.iohao.mmo.login.proto.UserInfo;
import lombok.extern.slf4j.Slf4j;

import java.util.Scanner;

/**
 * @author 渔民小镇
 * @date 2023-07-21
 */
@Slf4j
public class LoginInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = LoginCmd.cmd;
        this.inputCommandCreate.cmdName = "大厅";

        String jwt = clientUser.getJwt();
        // 如果没有JWT，可以使用用户名密码登录或注册
        // AssertKit.assertTrueThrow(StrKit.isEmpty(jwt), "必须设置登录用的 jwt");

        ofCommand(LoginCmd.loginVerify).setTitle("登录").setRequestData(() -> {
            // 请求参数
            LoginVerify loginVerify = new LoginVerify();
            loginVerify.jwt = clientUser.getJwt();
            return loginVerify;
        }).callback(result -> {
            UserInfo userInfo = result.getValue(UserInfo.class);
            log.info("登录成功 : {}", userInfo);
            clientUser.setUserId(userInfo.id);
            clientUser.setNickname(userInfo.nickname);
            clientUser.callbackInputCommandRegion();
        });

        // 如果JWT不为空，才自动登录
        if (!StrKit.isEmpty(jwt)) {
            TaskKit.runOnceMillis(() -> {
                // 自动登录
                ofRequestCommand(LoginCmd.loginVerify).execute();
            }, 200);
        }

        ofCommand(LoginCmd.userIp).setTitle("演示获取玩家 ip").callback(result -> {
            var value = result.getString();
            log.info("玩家 ip : {}", value);
        });

        ofCommand(LoginCmd.register).setTitle("注册账号").setRequestData(() -> {
            Scanner scanner = new Scanner(System.in);

            System.out.print("请输入用户名: ");
            String username = scanner.nextLine();

            System.out.print("请输入密码: ");
            String password = scanner.nextLine();

            // 注册请求
            RegisterRequest registerRequest = new RegisterRequest();
            registerRequest.username = username;
            registerRequest.password = password;

            return registerRequest;
        }).callback(result -> {
            RegisterResponse response = result.getValue(RegisterResponse.class);
            if (response.success) {
                log.info("注册成功: 用户ID={}, 用户名={}, 昵称={}",
                        response.userId, response.username, response.nickname);

                // 注册成功后自动登录
                LoginVerify loginVerify = new LoginVerify();
                loginVerify.username = response.username;
                loginVerify.password = response.password;

                // 使用用户名密码登录
                // 将登录信息保存到客户端用户对象中
                clientUser.setJwt(null); // 清除JWT

                // 手动调用登录命令
                ofRequestCommand(LoginCmd.loginVerify)
                        .setRequestData(() -> loginVerify)
                        .execute();
            } else {
                log.error("注册失败");
            }
        });

        ofCommand(LoginCmd.loginVerify).setTitle("用户名密码登录").setRequestData(() -> {
            Scanner scanner = new Scanner(System.in);

            System.out.print("请输入用户名: ");
            String username = scanner.nextLine();

            System.out.print("请输入密码: ");
            String password = scanner.nextLine();

            // 登录请求
            LoginVerify loginVerify = new LoginVerify();
            loginVerify.username = username;
            loginVerify.password = password;

            return loginVerify;
        }).callback(result -> {
            UserInfo userInfo = result.getValue(UserInfo.class);
            log.info("登录成功 : {}", userInfo);
            clientUser.setUserId(userInfo.id);
            clientUser.setNickname(userInfo.nickname);
            clientUser.callbackInputCommandRegion();
        });
    }
}
