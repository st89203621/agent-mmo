package com.iohao.mmo.common.ai.impl;

import com.iohao.mmo.common.ai.AiProperties;
import com.iohao.mmo.common.ai.chat.AiChatMessage;
import com.iohao.mmo.common.ai.chat.AiChatProvider;
import com.iohao.mmo.common.ai.chat.AiChatRequest;
import com.volcengine.ark.runtime.model.completion.chat.ChatCompletionChunk;
import com.volcengine.ark.runtime.model.completion.chat.ChatCompletionRequest;
import com.volcengine.ark.runtime.model.completion.chat.ChatMessage;
import com.volcengine.ark.runtime.model.completion.chat.ChatMessageRole;
import com.volcengine.ark.runtime.service.ArkService;
import io.reactivex.Flowable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

@Slf4j
@RequiredArgsConstructor
public class VolcengineChatProvider implements AiChatProvider {

    private final AiProperties.Chat.Volcengine cfg;

    @Override
    public String complete(AiChatRequest request) {
        ChatCompletionRequest req = buildRequest(request);
        var resp = ark().createChatCompletion(req);
        return resp.getChoices().get(0).getMessage().getContent().toString().trim();
    }

    @Override
    public void stream(AiChatRequest request,
                       Consumer<String> onToken,
                       Consumer<String> onComplete,
                       Consumer<Throwable> onError) {
        try {
            ChatCompletionRequest req = buildRequest(request);
            StringBuilder full = new StringBuilder();
            Flowable<ChatCompletionChunk> stream = ark().streamChatCompletion(req);
            stream.blockingForEach(chunk -> {
                if (chunk.getChoices() == null || chunk.getChoices().isEmpty()) {
                    return;
                }
                var msg = chunk.getChoices().get(0).getMessage();
                if (msg == null || msg.getContent() == null) {
                    return;
                }
                String token = msg.getContent().toString();
                full.append(token);
                onToken.accept(token);
            });
            onComplete.accept(full.toString());
        } catch (Throwable t) {
            onError.accept(t);
        }
    }

    @Override
    public String providerName() {
        return "volcengine";
    }

    private ArkService ark() {
        return VolcengineArkHolder.get(cfg.getApiKey());
    }

    private ChatCompletionRequest buildRequest(AiChatRequest request) {
        List<ChatMessage> messages = new ArrayList<>(request.getMessages().size());
        for (AiChatMessage m : request.getMessages()) {
            messages.add(ChatMessage.builder()
                    .role(mapRole(m.getRole()))
                    .content(m.getContent())
                    .build());
        }
        var b = ChatCompletionRequest.builder()
                .model(pickModel(request.getModelOverride()))
                .messages(messages);
        if (request.getMaxTokens() != null) b.maxTokens(request.getMaxTokens());
        if (request.getTemperature() != null) b.temperature(request.getTemperature());
        return b.build();
    }

    private String pickModel(String override) {
        return (override == null || override.isBlank()) ? cfg.getModel() : override;
    }

    private static ChatMessageRole mapRole(String role) {
        return switch (role) {
            case AiChatMessage.ROLE_SYSTEM -> ChatMessageRole.SYSTEM;
            case AiChatMessage.ROLE_ASSISTANT -> ChatMessageRole.ASSISTANT;
            default -> ChatMessageRole.USER;
        };
    }
}
