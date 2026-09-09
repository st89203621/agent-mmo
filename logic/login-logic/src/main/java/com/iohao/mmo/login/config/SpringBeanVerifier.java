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
import com.iohao.mmo.login.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Spring Bean验证器
 *
 * @author 渔民小镇
 * @date 2024-06-01
 */
@Slf4j
@Component
@Order(1) // 确保在其他组件之前运行
@AllArgsConstructor
public class SpringBeanVerifier implements CommandLineRunner {
    
    private final ApplicationContext applicationContext;

    @Override
    public void run(String... args) throws Exception {
        log.info("==================== Spring Bean 验证 ====================");
        
        // 1. 验证Spring上下文
        verifyApplicationContext();
        
        // 2. 验证MongoDB相关Bean
        verifyMongoDBBeans();
        
        // 3. 验证UserService相关Bean
        verifyUserServiceBeans();
        
        // 4. 列出所有Bean
        listAllBeans();
        
        log.info("==================== Spring Bean 验证完成 ====================");
    }

    private void verifyApplicationContext() {
        if (applicationContext != null) {
            log.info("✅ Spring ApplicationContext 可用");
            log.info("   Bean总数: {}", applicationContext.getBeanDefinitionCount());
        } else {
            log.error("❌ Spring ApplicationContext 不可用");
        }
    }

    private void verifyMongoDBBeans() {
        try {
            // 检查MongoTemplate
            MongoTemplate mongoTemplate = applicationContext.getBean(MongoTemplate.class);
            log.info("✅ MongoTemplate Bean 存在: {}", mongoTemplate.getClass().getName());
            
            // 测试MongoDB连接
            String dbName = mongoTemplate.getDb().getName();
            log.info("   数据库名称: {}", dbName);
            
        } catch (Exception e) {
            log.error("❌ MongoTemplate Bean 不存在或连接失败: {}", e.getMessage());
        }
    }

    private void verifyUserServiceBeans() {
        try {
            // 检查UserRepository
            UserRepository userRepository = applicationContext.getBean(UserRepository.class);
            log.info("✅ UserRepository Bean 存在: {}", userRepository.getClass().getName());
            
            // 测试Repository
            long count = userRepository.count();
            log.info("   当前用户数量: {}", count);
            
        } catch (Exception e) {
            log.error("❌ UserRepository Bean 不存在: {}", e.getMessage());
        }

        try {
            // 检查UserService
            UserService userService = applicationContext.getBean(UserService.class);
            log.info("✅ UserService Bean 存在: {}", userService.getClass().getName());
            
        } catch (Exception e) {
            log.error("❌ UserService Bean 不存在: {}", e.getMessage());
        }
    }

    private void listAllBeans() {
        log.info("📋 所有Spring Bean列表:");
        String[] beanNames = applicationContext.getBeanDefinitionNames();
        
        // 过滤出我们关心的Bean
        Arrays.stream(beanNames)
            .filter(name -> name.toLowerCase().contains("user") || 
                           name.toLowerCase().contains("mongo") ||
                           name.toLowerCase().contains("login"))
            .sorted()
            .forEach(name -> {
                try {
                    Object bean = applicationContext.getBean(name);
                    log.info("   - {}: {}", name, bean.getClass().getName());
                } catch (Exception e) {
                    log.warn("   - {}: 获取失败 - {}", name, e.getMessage());
                }
            });
    }
}
