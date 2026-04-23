package com.iohao.mmo.common.ai.chat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiChatMessage {
    public static final String ROLE_SYSTEM = "system";
    public static final String ROLE_USER = "user";
    public static final String ROLE_ASSISTANT = "assistant";

    private String role;
    private String content;

    public static AiChatMessage system(String content) {
        return new AiChatMessage(ROLE_SYSTEM, content);
    }

    public static AiChatMessage user(String content) {
        return new AiChatMessage(ROLE_USER, content);
    }

    public static AiChatMessage assistant(String content) {
        return new AiChatMessage(ROLE_ASSISTANT, content);
    }
}
