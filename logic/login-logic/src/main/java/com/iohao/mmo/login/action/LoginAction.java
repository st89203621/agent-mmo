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
package com.iohao.mmo.login.action;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.github.javafaker.Faker;
import com.github.javafaker.Name;
import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.exception.MsgException;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.common.annotation.IoThread;
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.common.core.flow.MyAttachment;
import com.iohao.mmo.common.core.flow.MyFlowContext;
import com.iohao.mmo.login.cmd.LoginCmd;
import com.iohao.mmo.login.entity.User;
import com.iohao.mmo.login.proto.LoginVerify;
import com.iohao.mmo.login.proto.RegisterRequest;
import com.iohao.mmo.login.proto.RegisterResponse;
import com.iohao.mmo.login.proto.UserInfo;
import com.iohao.mmo.login.service.UserService;
import com.iohao.mmo.login.service.UserDataService;
import com.iohao.mmo.login.service.UserServiceProvider;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * @author 渔民小镇
 * @date 2023-07-21
 */
@Slf4j
@Component
@ActionController(LoginCmd.cmd)
public class LoginAction implements ApplicationContextAware {
    // cn name
    static final Name name = new Faker(Locale.CHINA).name();

    @Resource
    UserService userService;

    @Resource
    UserDataService userDataService;

    private static ApplicationContext applicationContext;
    private static UserService tempUserServiceInstance;

    /**
     * 登录验证
     */
    @IoThread
    @ActionMethod(LoginCmd.loginVerify)
    public UserInfo loginVerify(LoginVerify loginVerify, FlowContext flowContext) {
        log.info("收到登录请求: {}", loginVerify);

        // 检查是否包含JWT（优先处理JWT登录）
        if (loginVerify.jwt != null && !loginVerify.jwt.isEmpty()) {
            log.info("检测到JWT登录: jwt={}", loginVerify.jwt);
            return handleJwtLogin(loginVerify.jwt, flowContext);
        }

        // 检查是否包含用户名密码
        if (loginVerify.username != null && !loginVerify.username.isEmpty()
            && loginVerify.password != null && !loginVerify.password.isEmpty()) {
            log.info("检测到用户名密码登录: username={}", loginVerify.username);
            return handleUsernameLogin(loginVerify.username, loginVerify.password, flowContext);
        }

        log.warn("登录请求缺少必要参数: {}", loginVerify);
        throw new MsgException(GameCode.loginFailed);
    }

    /**
     * 处理用户名密码登录
     */
    private UserInfo handleUsernameLogin(String username, String password, FlowContext flowContext) {
        User user = userService.verifyLogin(username, password);
        GameCode.loginVerify.assertTrue(flowContext.bindingUserId(user.getId()));

        MyAttachment attachment = createAttachment(user.getId(), user.getNickname(), flowContext);

        UserInfo userInfo = new UserInfo();
        userInfo.id = user.getId();
        userInfo.nickname = user.getNickname();
        userInfo.username = user.getUsername();

        log.info("用户登录成功: {}", username);
        return userInfo;
    }

    /**
     * 处理JWT登录（演示用）
     */
    private UserInfo handleJwtLogin(String jwt, FlowContext flowContext) {
        try {
            long userId = Math.abs(Long.parseLong(jwt));
            GameCode.loginVerify.assertTrue(flowContext.bindingUserId(userId));

            MyAttachment attachment = createAttachment(userId, null, flowContext);

            UserInfo userInfo = new UserInfo();
            userInfo.id = userId;
            userInfo.nickname = attachment.nickname;
            userInfo.username = "user_" + userId;

            log.info("JWT登录成功: userId={}", userId);
            return userInfo;
        } catch (NumberFormatException e) {
            log.warn("JWT格式错误: {}", jwt);
            throw new MsgException(GameCode.loginFailed);
        }
    }

    /**
     * 获取玩家 ip
     *
     * @param flowContext flowContext
     * @return 玩家 ip
     */
    @ActionMethod(LoginCmd.userIp)
    public String getUserIp(MyFlowContext flowContext) {
        // 这个 action 写着玩的，目前没什么作用，只是为了演示 ip 获取
        return flowContext.getUserIp();
    }

    /**
     * 注册账号
     */
    @ActionMethod(LoginCmd.register)
    public RegisterResponse register(RegisterRequest registerRequest) {
        log.info("收到注册请求: {}", registerRequest);

        String username = registerRequest.username;
        String password = registerRequest.password;

        if (username == null || username.isEmpty() || password == null || password.isEmpty()) {
            log.warn("注册请求缺少必要参数: {}", registerRequest);
            throw new MsgException(GameCode.loginFailed);
        }

        User user = userService.register(username, password);

        RegisterResponse response = new RegisterResponse();
        response.success = true;
        response.userId = user.getId();
        response.username = user.getUsername();
        response.password = password;
        response.nickname = user.getNickname();

        log.info("用户注册成功: {}", user.getUsername());
        return response;
    }

    /**
     * 创建用户附加信息
     */
    private MyAttachment createAttachment(long userId, String nickname, FlowContext flowContext) {
        MyAttachment attachment = new MyAttachment();
        attachment.userId = userId;
        attachment.nickname = nickname != null ? nickname : name.lastName() + name.firstName();

        flowContext.updateAttachment(attachment);
        return attachment;
    }

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) {
        LoginAction.applicationContext = applicationContext;
    }


}
