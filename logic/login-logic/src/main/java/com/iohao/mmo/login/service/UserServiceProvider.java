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

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

/**
 * UserService提供者 - 确保获取到真正的数据库UserService
 *
 * @author 渔民小镇
 * @date 2024-06-01
 */
@Slf4j
@Component
public class UserServiceProvider implements ApplicationContextAware {
    
    private static ApplicationContext applicationContext;
    private static UserService cachedUserService;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        UserServiceProvider.applicationContext = applicationContext;
        log.info("✅ UserServiceProvider 已获取 Spring ApplicationContext");
        
        // 立即尝试获取UserService并缓存
        try {
            cachedUserService = applicationContext.getBean(UserService.class);
            log.info("✅ UserService 已缓存: {}", cachedUserService.getClass().getName());
        } catch (Exception e) {
            log.error("❌ 无法获取UserService: {}", e.getMessage());
        }
    }

    /**
     * 获取真正的UserService（数据库版本）
     * 如果获取失败，抛出异常而不是返回临时版本
     */
    public static UserService getUserService() {
        if (cachedUserService != null) {
            log.debug("使用缓存的UserService（MongoDB持久化）");
            return cachedUserService;
        }

        if (applicationContext != null) {
            try {
                UserService userService = applicationContext.getBean(UserService.class);
                cachedUserService = userService; // 缓存起来
                log.info("✅ 从Spring上下文获取UserService（MongoDB持久化）");
                return userService;
            } catch (Exception e) {
                log.error("❌ 无法从Spring上下文获取UserService: {}", e.getMessage());
                throw new RuntimeException("UserService不可用，请检查Spring配置和MongoDB连接", e);
            }
        }

        throw new RuntimeException("Spring ApplicationContext不可用，无法获取UserService");
    }

    /**
     * 检查UserService是否可用
     */
    public static boolean isUserServiceAvailable() {
        try {
            getUserService();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 强制刷新UserService缓存
     */
    public static void refreshUserService() {
        cachedUserService = null;
        if (applicationContext != null) {
            try {
                cachedUserService = applicationContext.getBean(UserService.class);
                log.info("✅ UserService缓存已刷新");
            } catch (Exception e) {
                log.error("❌ 刷新UserService缓存失败: {}", e.getMessage());
            }
        }
    }
}
