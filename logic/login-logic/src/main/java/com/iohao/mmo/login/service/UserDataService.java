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

import com.iohao.mmo.login.entity.User;
import com.iohao.mmo.login.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.StreamSupport;

/**
 * 用户数据服务 - 用于查看和管理用户数据
 *
 * @author 渔民小镇
 * @date 2024-06-01
 */
@Slf4j
@Service
@AllArgsConstructor
public class UserDataService {
    
    private final UserRepository userRepository;

    /**
     * 获取所有用户列表
     */
    public List<User> getAllUsers() {
        Iterable<User> users = userRepository.findAll();
        return StreamSupport.stream(users.spliterator(), false).toList();
    }

    /**
     * 打印所有用户信息
     */
    public void printAllUsers() {
        List<User> users = getAllUsers();
        log.info("=== 数据库中的所有用户 ===");
        log.info("总用户数: {}", users.size());
        
        if (users.isEmpty()) {
            log.info("数据库中暂无用户数据");
        } else {
            users.forEach(user -> {
                log.info("用户ID: {}, 用户名: {}, 昵称: {}, 创建时间: {}", 
                    user.getId(), user.getUsername(), user.getNickname(), 
                    new java.util.Date(user.getCreateTime()));
            });
        }
        log.info("========================");
    }

    /**
     * 获取用户总数
     */
    public long getUserCount() {
        return userRepository.count();
    }

    /**
     * 清空所有用户数据（谨慎使用）
     */
    public void clearAllUsers() {
        long count = getUserCount();
        userRepository.deleteAll();
        log.warn("已清空所有用户数据，删除了 {} 个用户", count);
    }
}
