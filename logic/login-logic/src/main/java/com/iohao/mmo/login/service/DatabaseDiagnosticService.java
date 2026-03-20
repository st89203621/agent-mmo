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
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

/**
 * 数据库诊断服务
 *
 * @author 渔民小镇
 * @date 2024-06-01
 */
@Slf4j
@Service
@AllArgsConstructor
public class DatabaseDiagnosticService {
    
    private final MongoTemplate mongoTemplate;
    private final UserRepository userRepository;

    /**
     * 完整的数据库诊断
     */
    public void fullDiagnostic() {
        log.info("==================== 数据库诊断开始 ====================");
        
        try {
            // 1. 检查数据库连接
            checkDatabaseConnection();
            
            // 2. 检查集合信息
            checkCollections();
            
            // 3. 检查用户数据
            checkUserData();
            
            // 4. 检查Repository
            checkRepository();
            
        } catch (Exception e) {
            log.error("❌ 数据库诊断过程中发生错误: {}", e.getMessage(), e);
        }
        
        log.info("==================== 数据库诊断结束 ====================");
    }

    /**
     * 检查数据库连接
     */
    private void checkDatabaseConnection() {
        try {
            String dbName = mongoTemplate.getDb().getName();
            log.info("✅ 数据库连接成功");
            log.info("   - 数据库名称: {}", dbName);
            log.info("   - 连接地址: mongodb://localhost:27017/{}", dbName);
        } catch (Exception e) {
            log.error("❌ 数据库连接失败: {}", e.getMessage());
        }
    }

    /**
     * 检查集合信息
     */
    private void checkCollections() {
        try {
            Set<String> collections = mongoTemplate.getCollectionNames();
            log.info("✅ 数据库集合列表:");
            
            if (collections.isEmpty()) {
                log.info("   - 数据库中暂无集合");
            } else {
                collections.forEach(collection -> {
                    long count = mongoTemplate.getCollection(collection).countDocuments();
                    log.info("   - 集合: {} (文档数: {})", collection, count);
                });
            }
            
            // 特别检查user集合
            if (collections.contains("user")) {
                log.info("✅ user集合存在");
            } else {
                log.warn("⚠️  user集合不存在（可能还没有用户注册）");
            }
            
        } catch (Exception e) {
            log.error("❌ 检查集合信息失败: {}", e.getMessage());
        }
    }

    /**
     * 检查用户数据
     */
    private void checkUserData() {
        try {
            // 使用MongoTemplate直接查询
            List<User> users = mongoTemplate.findAll(User.class);
            log.info("✅ 用户数据检查 (MongoTemplate):");
            log.info("   - 用户总数: {}", users.size());
            
            if (!users.isEmpty()) {
                log.info("   - 用户列表:");
                users.forEach(user -> {
                    log.info("     * ID: {}, 用户名: {}, 昵称: {}, 创建时间: {}", 
                        user.getId(), user.getUsername(), user.getNickname(), 
                        new java.util.Date(user.getCreateTime()));
                });
            } else {
                log.info("   - 暂无用户数据");
            }
            
        } catch (Exception e) {
            log.error("❌ 检查用户数据失败: {}", e.getMessage());
        }
    }

    /**
     * 检查Repository
     */
    private void checkRepository() {
        try {
            long count = userRepository.count();
            log.info("✅ UserRepository检查:");
            log.info("   - Repository用户总数: {}", count);
            
            if (count > 0) {
                Iterable<User> users = userRepository.findAll();
                log.info("   - Repository查询结果:");
                users.forEach(user -> {
                    log.info("     * ID: {}, 用户名: {}", user.getId(), user.getUsername());
                });
            }
            
        } catch (Exception e) {
            log.error("❌ Repository检查失败: {}", e.getMessage());
        }
    }

    /**
     * 测试保存用户
     */
    public void testSaveUser() {
        try {
            log.info("🧪 测试保存用户...");
            
            User testUser = new User();
            testUser.setId(System.currentTimeMillis());
            testUser.setUsername("test_" + System.currentTimeMillis());
            testUser.setPassword("test123");
            testUser.setNickname("测试用户");
            testUser.setCreateTime(System.currentTimeMillis());
            
            // 保存用户
            User savedUser = userRepository.save(testUser);
            log.info("✅ 测试用户保存成功: {}", savedUser.getUsername());
            
            // 立即查询验证
            User foundUser = userRepository.findById(savedUser.getId()).orElse(null);
            if (foundUser != null) {
                log.info("✅ 测试用户查询成功: {}", foundUser.getUsername());
            } else {
                log.error("❌ 测试用户查询失败");
            }
            
        } catch (Exception e) {
            log.error("❌ 测试保存用户失败: {}", e.getMessage(), e);
        }
    }
}
