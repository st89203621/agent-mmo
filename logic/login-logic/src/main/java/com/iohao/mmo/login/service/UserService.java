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
package com.iohao.mmo.login.service;

import com.github.javafaker.Faker;
import com.github.javafaker.Name;
import com.iohao.game.action.skeleton.core.exception.MsgException;
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.common.snow.SnowKit;
import com.iohao.mmo.login.entity.User;
import com.iohao.mmo.login.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

/**
 * 用户服务
 *
 * @author 渔民小镇
 * @date 2024-06-01
 */
@Slf4j
@Service
@AllArgsConstructor
public class UserService {
    // 中文名生成器
    static final Name name = new Faker(Locale.CHINA).name();

    final UserRepository userRepository;

    /**
     * 注册用户
     */
    public User register(String username, String password) {
        if (userRepository.existsByUsername(username)) {
            log.warn("用户名已存在: {}", username);
            throw new MsgException(GameCode.usernameExists);
        }

        User user = new User();
        user.setId(SnowKit.next());
        user.setUsername(username);
        user.setPassword(password);
        user.setNickname(name.lastName() + name.firstName());
        user.setCreateTime(System.currentTimeMillis());

        User savedUser = userRepository.save(user);
        log.info("用户注册成功: ID={}, 用户名={}", savedUser.getId(), savedUser.getUsername());

        return savedUser;
    }

    /**
     * 根据用户名查找用户
     *
     * @param username 用户名
     * @return 用户
     */
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * 根据ID查找用户
     *
     * @param userId 用户ID
     * @return 用户
     */
    public Optional<User> findById(long userId) {
        return userRepository.findById(userId);
    }

    /**
     * 验证用户登录
     */
    public User verifyLogin(String username, String password) {
        Optional<User> userOptional = findByUsername(username);

        if (userOptional.isEmpty()) {
            log.warn("用户不存在: {}", username);
            throw new MsgException(GameCode.loginFailed);
        }

        User user = userOptional.get();
        if (!user.getPassword().equals(password)) {
            log.warn("密码错误: {}", username);
            throw new MsgException(GameCode.loginFailed);
        }

        log.info("用户登录验证成功: {}", username);
        return user;
    }
}
