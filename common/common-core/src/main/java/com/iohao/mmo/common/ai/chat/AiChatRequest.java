package com.iohao.mmo.common.ai.chat;

import lombok.Builder;
import lombok.Data;
import lombok.Singular;

import java.util.List;

@Data
@Builder
public class AiChatRequest {
    @Singular
    private List<AiChatMessage> messages;
    private Integer maxTokens;
    private Double temperature;
    private String modelOverride;
}
