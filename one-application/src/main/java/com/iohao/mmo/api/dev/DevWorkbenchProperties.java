package com.iohao.mmo.api.dev;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * AI 素材工作台配置。
 *
 * <ul>
 *   <li>{@code assetsPath}：生成图片本地落盘根目录</li>
 *   <li>{@code adminUsernames}：可使用工作台的用户白名单。空集合表示禁用工作台</li>
 *   <li>{@code maxBatch}：单次生成图片张数上限</li>
 * </ul>
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "dev.workbench")
public class DevWorkbenchProperties {

    private String assetsPath = "./game-client/dist/assets/dev-workbench";
    private List<String> adminUsernames = List.of();
    private int maxBatch = 8;
    private int maxUploadKb = 8 * 1024;
}
