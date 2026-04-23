package com.iohao.mmo.config;

import com.iohao.mmo.common.ai.AiProperties;
import com.iohao.mmo.common.ai.chat.AiChatProvider;
import com.iohao.mmo.common.ai.image.AiImageProvider;
import com.iohao.mmo.common.ai.impl.LocalChatProvider;
import com.iohao.mmo.common.ai.impl.LocalImageProvider;
import com.iohao.mmo.common.ai.impl.VolcengineChatProvider;
import com.iohao.mmo.common.ai.impl.VolcengineImageProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AI Provider 装配：按 ai.chat.provider / ai.image.provider 切换 local 或 volcengine。
 */
@Slf4j
@Configuration
@EnableConfigurationProperties(AiProperties.class)
public class AiAutoConfiguration {

    @Bean
    public AiChatProvider aiChatProvider(AiProperties props) {
        String p = normalize(props.getChat().getProvider());
        AiChatProvider provider = "local".equals(p)
                ? new LocalChatProvider(props.getChat().getLocal())
                : new VolcengineChatProvider(props.getChat().getVolcengine());
        log.info("AiChatProvider -> {}", provider.providerName());
        return provider;
    }

    @Bean
    public AiImageProvider aiImageProvider(AiProperties props) {
        String p = normalize(props.getImage().getProvider());
        AiImageProvider provider = "local".equals(p)
                ? new LocalImageProvider(props.getImage().getLocal())
                : new VolcengineImageProvider(props.getImage().getVolcengine());
        log.info("AiImageProvider -> {}", provider.providerName());
        return provider;
    }

    private static String normalize(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase();
    }
}
