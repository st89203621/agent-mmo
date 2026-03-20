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
package com.iohao.mmo.pet.util;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 火山引擎配置 - 使用ArkService（参照ImageGenerationsExample）
 *
 * @author 渔民小镇
 * @date 2024-10-13
 */
@Slf4j
@Data
@Configuration
@ConfigurationProperties(prefix = "volcengine")
public class VolcengineConfig {

    // ArkService API Key（参照ImageGenerationsExample）
    private String apiKey = "3e2f9349-8892-4a67-ae9c-7e8fbd75f071";

    // 图片生成模型（参照ImageGenerationsExample）
    private String model = "doubao-seedream-4-0-250828";

    // 前端静态资源目录（图片保存路径）- 默认使用项目相对路径
    private String frontendAssetsPath = "./my-phaser-game/assets/pets/ai-generated";

    // 前端服务器URL配置值（用于生成完整的图片访问URL）
    // 支持三种配置方式:
    // 1. 完整URL: http://192.168.0.105:8080
    // 2. 端口号: 8080 (自动检测本机IP)
    // 3. auto (自动检测本机IP,使用默认端口8080)
    private String frontendServerUrl = "auto";

    // 缓存解析后的URL（仅用于日志显示）
    private String resolvedUrl;

    // 背景去除配置
    // 容差值 - 越大越激进地去除背景 (建议: 30-80)
    private int backgroundRemovalTolerance = 40;

    // 亮度阈值 - RGB平均值超过此值认为是背景 (建议: 220-250)
    private int backgroundRemovalBrightness = 230;

    // 旧的配置保留（兼容性）
    private String accessKeyId = "";
    private String secretAccessKey = "";

    /**
     * 初始化配置 - 自动处理frontendServerUrl
     */
    @PostConstruct
    public void init() {
        resolvedUrl = resolveFrontendServerUrl(frontendServerUrl);
        log.info("🌐 Volcengine配置初始化完成");
        log.info("   - 前端服务器URL配置: {}", frontendServerUrl);
        log.info("   - 当前解析URL: {}", resolvedUrl);
        log.info("   - 静态资源路径: {}", frontendAssetsPath);
        log.info("   - 背景去除容差: {}", backgroundRemovalTolerance);
        log.info("   - 背景去除亮度: {}", backgroundRemovalBrightness);
    }

    /**
     * 获取前端服务器URL - 动态解析，支持网络变化
     *
     * @return 解析后的完整URL
     */
    public String getFrontendServerUrl() {
        return resolveFrontendServerUrl(frontendServerUrl);
    }

    /**
     * 解析前端服务器URL
     *
     * @param configValue 配置值
     * @return 解析后的完整URL
     */
    private String resolveFrontendServerUrl(String configValue) {
        if (configValue == null || configValue.trim().isEmpty()) {
            configValue = "auto";
        }

        configValue = configValue.trim();

        // 如果已经是完整的URL,直接返回
        if (configValue.startsWith("http://") || configValue.startsWith("https://")) {
            return configValue;
        }

        // 如果是"auto",使用默认端口8080
        if ("auto".equalsIgnoreCase(configValue)) {
            return NetworkUtils.buildFrontendServerUrl(8080);
        }

        // 如果是纯数字,当作端口号处理
        try {
            int port = Integer.parseInt(configValue);
            return NetworkUtils.buildFrontendServerUrl(port);
        } catch (NumberFormatException e) {
            // 不是数字,使用默认配置
            log.warn("⚠️ 无法解析frontendServerUrl配置: {}, 使用默认配置", configValue);
            return NetworkUtils.buildFrontendServerUrl(8080);
        }
    }
}
