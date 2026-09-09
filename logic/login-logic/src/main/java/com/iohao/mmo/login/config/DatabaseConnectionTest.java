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

import com.iohao.mmo.login.repository.UserRepository;
import com.iohao.mmo.login.service.DatabaseDiagnosticService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * 数据库连接测试
 *
 * @author 渔民小镇
 * @date 2024-06-01
 */
@Slf4j
@Component
@Order(2) // 在SpringBeanVerifier之后运行
@AllArgsConstructor
public class DatabaseConnectionTest implements CommandLineRunner {

    private final MongoTemplate mongoTemplate;
    private final UserRepository userRepository;
    private final DatabaseDiagnosticService diagnosticService;

    @Override
    public void run(String... args) throws Exception {
        // 运行完整的数据库诊断
        diagnosticService.fullDiagnostic();

        // 如果没有用户数据，运行测试保存
        try {
            long userCount = userRepository.count();
            if (userCount == 0) {
                log.info("🧪 数据库中暂无用户，运行测试保存...");
                diagnosticService.testSaveUser();
            }
        } catch (Exception e) {
            log.error("❌ 检查用户数量失败: {}", e.getMessage());
        }
    }
}
