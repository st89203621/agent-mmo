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
package com.iohao.mmo.login.config;

import com.iohao.mmo.login.service.UserService;
import com.iohao.mmo.login.service.UserServiceProvider;
import com.iohao.mmo.login.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * 数据库必需检查器 - 确保数据库连接和UserService可用
 *
 * @author 渔民小镇
 * @date 2024-06-01
 */
@Slf4j
@Component
@Order(0) // 最高优先级，第一个运行
@AllArgsConstructor
public class DatabaseRequiredChecker implements CommandLineRunner {
    
    private final MongoTemplate mongoTemplate;
    private final UserRepository userRepository;
    private final UserService userService;

    @Override
    public void run(String... args) throws Exception {
        log.info("==================== 数据库必需检查 ====================");
        
        boolean allChecksPass = true;
        
        // 1. 检查MongoDB连接
        if (!checkMongoDBConnection()) {
            allChecksPass = false;
        }
        
        // 2. 检查UserRepository
        if (!checkUserRepository()) {
            allChecksPass = false;
        }
        
        // 3. 检查UserService
        if (!checkUserService()) {
            allChecksPass = false;
        }
        
        // 4. 检查UserServiceProvider
        if (!checkUserServiceProvider()) {
            allChecksPass = false;
        }
        
        if (allChecksPass) {
            log.info("✅ 所有数据库检查通过，用户数据将持久化到MongoDB数据库");
            
            // 测试保存一个用户验证持久化
            testUserPersistence();
            
        } else {
            log.error("❌ 数据库检查失败，应用将无法正常工作");
            log.error("   请检查MongoDB是否启动，配置是否正确");
            throw new RuntimeException("数据库检查失败，无法启动应用");
        }
        
        log.info("==================== 数据库必需检查完成 ====================");
    }

    private boolean checkMongoDBConnection() {
        try {
            String dbName = mongoTemplate.getDb().getName();
            log.info("✅ MongoDB连接成功，数据库: {}", dbName);
            return true;
        } catch (Exception e) {
            log.error("❌ MongoDB连接失败: {}", e.getMessage());
            return false;
        }
    }

    private boolean checkUserRepository() {
        try {
            long count = userRepository.count();
            log.info("✅ UserRepository可用，当前用户数: {}", count);
            return true;
        } catch (Exception e) {
            log.error("❌ UserRepository不可用: {}", e.getMessage());
            return false;
        }
    }

    private boolean checkUserService() {
        if (userService != null) {
            log.info("✅ UserService注入成功: {}", userService.getClass().getName());
            return true;
        } else {
            log.error("❌ UserService注入失败");
            return false;
        }
    }

    private boolean checkUserServiceProvider() {
        try {
            boolean available = UserServiceProvider.isUserServiceAvailable();
            if (available) {
                log.info("✅ UserServiceProvider可用");
                return true;
            } else {
                log.error("❌ UserServiceProvider不可用");
                return false;
            }
        } catch (Exception e) {
            log.error("❌ UserServiceProvider检查失败: {}", e.getMessage());
            return false;
        }
    }

    private void testUserPersistence() {
        try {
            log.info("🧪 测试用户数据持久化...");
            
            String testUsername = "persistence_test_" + System.currentTimeMillis();
            
            // 使用UserService注册测试用户
            var testUser = userService.register(testUsername, "test123");
            log.info("✅ 测试用户创建成功: {}", testUser.getUsername());
            
            // 立即查询验证
            var foundUser = userService.findByUsername(testUsername);
            if (foundUser.isPresent()) {
                log.info("✅ 测试用户查询成功，数据持久化正常");
                
                // 清理测试数据
                userRepository.deleteById(testUser.getId());
                log.info("🧹 测试数据已清理");
            } else {
                log.error("❌ 测试用户查询失败，数据持久化异常");
            }
            
        } catch (Exception e) {
            log.error("❌ 用户数据持久化测试失败: {}", e.getMessage());
        }
    }
}
