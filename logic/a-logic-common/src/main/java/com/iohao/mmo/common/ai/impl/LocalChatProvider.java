package com.iohao.mmo.common.ai.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iohao.mmo.common.ai.AiProperties;
import com.iohao.mmo.common.ai.chat.AiChatMessage;
import com.iohao.mmo.common.ai.chat.AiChatProvider;
import com.iohao.mmo.common.ai.chat.AiChatRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * OpenAI-Compatible 本地大模型 provider。
 * 兼容 vLLM / Ollama / llama.cpp-server 等，endpoint 为 {baseUrl}/chat/completions。
 */
@Slf4j
@RequiredArgsConstructor
public class LocalChatProvider implements AiChatProvider {

    private static final MediaType JSON_TYPE = MediaType.get("application/json; charset=utf-8");

    private final AiProperties.Chat.Local cfg;
    private final OkHttpClient client;

    public LocalChatProvider(AiProperties.Chat.Local cfg) {
        this.cfg = cfg;
        this.client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(cfg.getTimeoutSec(), TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                // 本地推理服务（vLLM/Ollama）空闲连接可能被 RST，禁用连接复用避免 "unexpected end of stream"
                .connectionPool(new ConnectionPool(0, 1, TimeUnit.NANOSECONDS))
                .retryOnConnectionFailure(true)
                .build();
    }

    @Override
    public String complete(AiChatRequest request) {
        JSONObject body = buildBody(request, false);
        Request req = newRequestBuilder("/chat/completions")
                .post(RequestBody.create(body.toJSONString(), JSON_TYPE))
                .build();
        try (Response resp = client.newCall(req).execute()) {
            if (!resp.isSuccessful() || resp.body() == null) {
                throw new RuntimeException("local chat HTTP " + resp.code()
                        + (resp.body() == null ? "" : " body=" + resp.body().string()));
            }
            JSONObject json = JSON.parseObject(resp.body().string());
            return extractContent(json);
        } catch (IOException e) {
            throw new RuntimeException("调用本地 chat 失败: " + e.getMessage(), e);
        }
    }

    @Override
    public void stream(AiChatRequest request,
                       Consumer<String> onToken,
                       Consumer<String> onComplete,
                       Consumer<Throwable> onError) {
        JSONObject body = buildBody(request, true);
        Request req = newRequestBuilder("/chat/completions")
                .post(RequestBody.create(body.toJSONString(), JSON_TYPE))
                .build();

        try (Response resp = client.newCall(req).execute()) {
            if (!resp.isSuccessful() || resp.body() == null) {
                throw new RuntimeException("local chat stream HTTP " + resp.code());
            }
            StringBuilder full = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(resp.body().byteStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) {
                    if (!line.startsWith("data:")) continue;
                    String payload = line.substring(5).trim();
                    if (payload.isEmpty() || "[DONE]".equals(payload)) continue;

                    JSONObject chunk = JSON.parseObject(payload);
                    String token = extractDeltaContent(chunk);
                    if (token != null && !token.isEmpty()) {
                        full.append(token);
                        onToken.accept(token);
                    }
                }
            }
            onComplete.accept(full.toString());
        } catch (Throwable t) {
            onError.accept(t);
        }
    }

    @Override
    public String providerName() {
        return "local";
    }

    private Request.Builder newRequestBuilder(String path) {
        Request.Builder b = new Request.Builder().url(trimSlash(cfg.getBaseUrl()) + path);
        if (cfg.getApiKey() != null && !cfg.getApiKey().isBlank()) {
            b.header("Authorization", "Bearer " + cfg.getApiKey());
        }
        return b;
    }

    private JSONObject buildBody(AiChatRequest request, boolean stream) {
        JSONObject body = new JSONObject();
        body.put("model", (request.getModelOverride() == null || request.getModelOverride().isBlank())
                ? cfg.getModel() : request.getModelOverride());

        JSONArray messages = new JSONArray();
        for (AiChatMessage m : request.getMessages()) {
            JSONObject msg = new JSONObject();
            msg.put("role", m.getRole());
            msg.put("content", m.getContent());
            messages.add(msg);
        }
        body.put("messages", messages);

        if (request.getMaxTokens() != null) body.put("max_tokens", request.getMaxTokens());
        if (request.getTemperature() != null) body.put("temperature", request.getTemperature());
        if (stream) body.put("stream", true);
        if (cfg.isDisableThinking()) {
            JSONObject kwargs = new JSONObject();
            kwargs.put("enable_thinking", false);
            body.put("chat_template_kwargs", kwargs);
        }
        return body;
    }

    private static String extractContent(JSONObject resp) {
        JSONArray choices = resp.getJSONArray("choices");
        if (choices == null || choices.isEmpty()) return "";
        JSONObject msg = choices.getJSONObject(0).getJSONObject("message");
        return msg == null ? "" : msg.getString("content");
    }

    private static String extractDeltaContent(JSONObject chunk) {
        JSONArray choices = chunk.getJSONArray("choices");
        if (choices == null || choices.isEmpty()) return null;
        JSONObject delta = choices.getJSONObject(0).getJSONObject("delta");
        return delta == null ? null : delta.getString("content");
    }

    private static String trimSlash(String url) {
        if (url == null) return "";
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
