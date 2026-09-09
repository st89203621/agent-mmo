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

import com.iohao.mmo.api.dev.DevWorkbenchProperties;
import com.iohao.mmo.pet.util.PetAssetProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * 静态资源配置 - 提供AI生成的宠物图片访问
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class StaticResourceConfig implements WebMvcConfigurer {

    private final PetAssetProperties petAssetProperties;
    private final DevWorkbenchProperties devWorkbenchProperties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String assetsPath = petAssetProperties.getFrontendAssetsPath();
        String resourceLocation = toFileUrl(assetsPath);
        log.info("🌐 宠物图片路径: {} → {}", "/assets/pets/ai-generated/**", resourceLocation);
        registry.addResourceHandler("/assets/pets/ai-generated/**")
                .addResourceLocations(resourceLocation)
                .setCachePeriod(3600);

        String devLocation = toFileUrl(Paths.get(devWorkbenchProperties.getAssetsPath())
                .toAbsolutePath().normalize().toString());
        log.info("🛠 工作台素材路径: {} → {}", "/assets/dev-workbench/**", devLocation);
        registry.addResourceHandler("/assets/dev-workbench/**")
                .addResourceLocations(devLocation)
                .setCachePeriod(0);
    }

    private static String toFileUrl(String path) {
        if (path.matches("^[A-Za-z]:.*")) {
            return "file:///" + path.replace("\\", "/") + "/";
        }
        return "file://" + path + "/";
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/assets/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "HEAD")
                .allowedHeaders("*")
                .maxAge(3600);
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
