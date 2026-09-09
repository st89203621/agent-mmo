package com.iohao.mmo.pet.util;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 宠物图片本地资源配置。
 * <ul>
 *   <li>{@code frontendAssetsPath}：生成图片保存目录（相对/绝对均可）</li>
 *   <li>{@code frontendServerUrl}：前端服务器 URL，用于拼出可访问的 HTTP 地址；支持 auto / 端口号 / 完整 URL 三种写法</li>
 *   <li>{@code backgroundRemovalTolerance}：黑背景转透明的容差阈值</li>
 * </ul>
 */
@Slf4j
@Data
@Configuration
@ConfigurationProperties(prefix = "pet.asset")
public class PetAssetProperties {

    private String frontendAssetsPath = "./game-client/dist/assets/pets/ai-generated";
    private String frontendServerUrl = "auto";
    private int backgroundRemovalTolerance = 40;

    private String resolvedUrl;

    @PostConstruct
    public void init() {
        resolvedUrl = resolveFrontendServerUrl(frontendServerUrl);
        log.info("PetAssetProperties 初始化: assets={}, serverUrl={}", frontendAssetsPath, resolvedUrl);
    }

    public String getFrontendServerUrl() {
        return resolveFrontendServerUrl(frontendServerUrl);
    }

    private String resolveFrontendServerUrl(String configValue) {
        String v = (configValue == null || configValue.isBlank()) ? "auto" : configValue.trim();
        if (v.startsWith("http://") || v.startsWith("https://")) return v;
        if ("auto".equalsIgnoreCase(v)) return NetworkUtils.buildFrontendServerUrl(8080);
        try {
            return NetworkUtils.buildFrontendServerUrl(Integer.parseInt(v));
        } catch (NumberFormatException e) {
            log.warn("无法解析 pet.asset.frontend-server-url={}, 使用默认 8080", v);
            return NetworkUtils.buildFrontendServerUrl(8080);
        }
    }
}
