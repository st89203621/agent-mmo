/*
 * ioGame
 * Copyright (C) 2021 - present  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
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
package com.iohao.mmo.config;

import com.iohao.mmo.pet.util.VolcengineConfig;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 静态资源配置 - 提供AI生成的宠物图片访问
 *
 * @author 渔民小镇
 * @date 2025-01-18
 */
@Slf4j
@Configuration
@AllArgsConstructor
public class StaticResourceConfig implements WebMvcConfigurer {

    private final VolcengineConfig volcengineConfig;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 配置AI生成的宠物图片静态资源访问
        String assetsPath = volcengineConfig.getFrontendAssetsPath();
        
        // 确保路径以file:///开头（Windows系统）
        String resourceLocation;
        if (assetsPath.matches("^[A-Za-z]:.*")) {
            // Windows路径，例如: D:/path/to/assets
            resourceLocation = "file:///" + assetsPath.replace("\\", "/") + "/";
        } else {
            // Unix路径
            resourceLocation = "file://" + assetsPath + "/";
        }
        
        log.info("🌐 配置静态资源访问:");
        log.info("   - URL路径: /assets/pets/ai-generated/**");
        log.info("   - 文件路径: {}", resourceLocation);
        
        registry.addResourceHandler("/assets/pets/ai-generated/**")
                .addResourceLocations(resourceLocation)
                .setCachePeriod(3600); // 缓存1小时
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/assets/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "HEAD")
                .allowedHeaders("*")
                .maxAge(3600);
        // 允许前端跨域访问游戏 REST API
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}

