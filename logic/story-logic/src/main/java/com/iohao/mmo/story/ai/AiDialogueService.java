package com.iohao.mmo.story.ai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iohao.mmo.common.ai.chat.AiChatMessage;
import com.iohao.mmo.common.ai.chat.AiChatProvider;
import com.iohao.mmo.common.ai.chat.AiChatRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

/**
 * AI 对话服务 - 驱动 NPC 实时对话生成。
 * 通过 AiChatProvider 抽象，支持本地 / 火山模型切换（ai.chat.provider=local|volcengine）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiDialogueService {

    private final AiChatProvider chatProvider;

    public DialogueAiResult generateNpcResponse(
            String npcName,
            String npcPersona,
            String bookTitle,
            String bookEra,
            String langStyle,
            List<String> keyFacts,
            int fateScore,
            String playerInput,
            String historyText) {

        String systemPrompt = buildSystemPrompt(npcName, npcPersona, bookTitle, bookEra, langStyle, keyFacts, fateScore);
        String userPrompt = buildUserPrompt(playerInput, historyText, fateScore);

        try {
            AiChatRequest request = AiChatRequest.builder()
                    .message(AiChatMessage.system(systemPrompt))
                    .message(AiChatMessage.user(userPrompt))
                    .maxTokens(512)
                    .temperature(0.8)
                    .build();

            String content = chatProvider.complete(request).trim();
            log.debug("AI对话原始回复: {}", content);
            return parseAiResponse(content, npcName);

        } catch (Exception e) {
            log.warn("AI对话生成失败，使用fallback: {}", e.getMessage());
            return buildFallbackResponse(npcName, fateScore);
        }
    }

    public void generateNpcResponseStream(
            String npcName, String npcPersona, String bookTitle, String bookEra,
            String langStyle, List<String> keyFacts, int fateScore,
            String playerInput, String historyText,
            Consumer<String> onChunk, Consumer<DialogueAiResult> onComplete, Consumer<Exception> onError) {

        String systemPrompt = buildSystemPrompt(npcName, npcPersona, bookTitle, bookEra, langStyle, keyFacts, fateScore);
        String userPrompt = buildUserPrompt(playerInput, historyText, fateScore);

        AiChatRequest request = AiChatRequest.builder()
                .message(AiChatMessage.system(systemPrompt))
                .message(AiChatMessage.user(userPrompt))
                .maxTokens(512)
                .temperature(0.8)
                .build();

        JsonTextExtractor extractor = new JsonTextExtractor("text", onChunk);
        chatProvider.stream(request,
                token -> extractor.feed(token),
                full -> {
                    log.debug("AI流式对话完整回复: {}", full);
                    onComplete.accept(parseAiResponse(full.trim(), npcName));
                },
                err -> {
                    log.warn("AI流式对话失败: {}", err.getMessage());
                    onError.accept(err instanceof Exception ex ? ex : new RuntimeException(err));
                });
    }

    private String buildSystemPrompt(String npcName, String npcPersona, String bookTitle,
                                      String bookEra, String langStyle, List<String> keyFacts, int fateScore) {
        StringBuilder sb = new StringBuilder();
        sb.append("你扮演一个真实的角色扮演游戏 NPC，根据剧情和角色设定自然回应。\n");
        sb.append("角色设定：").append(npcName).append("，").append(npcPersona).append("\n");
        sb.append("当前时代背景：《").append(bookTitle).append("》\n");
        if (bookEra != null && !bookEra.isBlank()) {
            sb.append("【书籍世界参考片段】\n").append(bookEra).append("\n");
            sb.append("（以上为书籍世界的原文片段，请根据这些内容丰富对话，但不要直接复述原文）\n");
        }
        sb.append("语言风格：").append(langStyle).append("，禁止使用现代网络用语\n");

        if (keyFacts != null && !keyFacts.isEmpty()) {
            sb.append("与玩家的关键往事：\n");
            keyFacts.stream().limit(5).forEach(f -> sb.append("  - ").append(f).append("\n"));
        }

        sb.append("当前缘分值：").append(fateScore).append("/100\n");
        if (fateScore >= 80) {
            sb.append("（缘分深厚，情感真挚，可适当流露深情）\n");
        } else if (fateScore >= 60) {
            sb.append("（缘分渐深，亲近有余，态度温和）\n");
        } else if (fateScore >= 30) {
            sb.append("（相识不深，保持礼貌距离）\n");
        } else {
            sb.append("（初次相识，略显疏离）\n");
        }

        sb.append("\n必须严格按照以下 JSON 格式回复，不要输出任何其他内容：\n");
        sb.append("{\n");
        sb.append("  \"speaker\": \"").append(npcName).append("\",\n");
        sb.append("  \"emotion\": \"calm/happy/sad/surprised/angry/shy/tender/cold/fearful/playful/melancholy/determined 之一（只能用这12个值）\",\n");
        sb.append("  \"text\": \"NPC 说的话，不超过 80 字\",\n");
        sb.append("  \"choices\": [\n");
        sb.append("    {\"id\": 0, \"text\": \"选项文字（15字内）\", \"fate\": 缘分变化(-5到+10), \"trust\": 信任变化(-3到+5)},\n");
        sb.append("    {\"id\": 1, \"text\": \"选项文字\", \"fate\": N, \"trust\": N},\n");
        sb.append("    {\"id\": 2, \"text\": \"选项文字\", \"fate\": N, \"trust\": N}\n");
        sb.append("  ],\n");
        sb.append("  \"allow_free_input\": true,\n");
        sb.append("  \"scene_hint\": \"如果场景发生变化（如转移地点、进入新环境、时间推移等），用10字以内描述新场景，否则留空字符串\"\n");
        sb.append("}");

        return sb.toString();
    }

    private String buildUserPrompt(String playerInput, String historyText, int fateScore) {
        StringBuilder sb = new StringBuilder();
        if (historyText != null && !historyText.isEmpty()) {
            sb.append("近期对话：\n").append(historyText).append("\n\n");
        }
        sb.append("玩家行动：").append(playerInput).append("\n");
        sb.append("请生成 NPC 自然的回应（JSON 格式）。");
        return sb.toString();
    }

    private DialogueAiResult parseAiResponse(String content, String npcName) {
        try {
            int start = content.indexOf('{');
            int end = content.lastIndexOf('}');
            if (start >= 0 && end > start) {
                content = content.substring(start, end + 1);
            }

            JSONObject json = JSON.parseObject(content);
            DialogueAiResult result = new DialogueAiResult();
            result.speaker = json.getString("speaker");
            if (result.speaker == null) result.speaker = npcName;
            result.emotion = json.getString("emotion");
            if (result.emotion == null) result.emotion = "calm";
            result.text = json.getString("text");
            if (result.text == null) result.text = "（沉默片刻）";
            result.allowFreeInput = json.getBooleanValue("allow_free_input", true);
            result.sceneHint = json.getString("scene_hint");
            if (result.sceneHint != null && result.sceneHint.isBlank()) result.sceneHint = null;

            var choicesArr = json.getJSONArray("choices");
            if (choicesArr != null) {
                result.choices = new ArrayList<>();
                for (int i = 0; i < choicesArr.size(); i++) {
                    JSONObject c = choicesArr.getJSONObject(i);
                    DialogueAiResult.Choice choice = new DialogueAiResult.Choice();
                    choice.id = c.getIntValue("id", i);
                    choice.text = c.getString("text");
                    choice.fateDelta = c.getIntValue("fate", 1);
                    choice.trustDelta = c.getIntValue("trust", 0);
                    result.choices.add(choice);
                }
            }
            return result;

        } catch (Exception e) {
            log.warn("解析AI回复JSON失败: {}, content={}", e.getMessage(), content);
            return buildFallbackResponse(npcName, 0);
        }
    }

    private DialogueAiResult buildFallbackResponse(String npcName, int fateScore) {
        DialogueAiResult result = new DialogueAiResult();
        result.speaker = npcName;
        result.emotion = "calm";
        result.allowFreeInput = true;

        if (fateScore >= 80) {
            result.text = "你总说些，叫我不知如何回答的话……";
        } else if (fateScore >= 60) {
            result.text = "你我之间，似有前缘，道友以为如何？";
        } else {
            result.text = "道友今日来此，有何贵干？";
        }

        result.choices = new ArrayList<>();
        result.choices.add(new DialogueAiResult.Choice(0, "点头，默不作声", 1, 1));
        result.choices.add(new DialogueAiResult.Choice(1, "随口寒暄几句", 3, 2));
        result.choices.add(new DialogueAiResult.Choice(2, "转身离去", -1, 0));
        return result;
    }

    /**
     * 流式 JSON text 字段提取器：只将 "text" 字段值转发给 onChunk。
     */
    private static class JsonTextExtractor {
        private enum State { SEEKING_KEY, SEEKING_COLON, SEEKING_QUOTE, EMITTING, DONE }

        private final String targetKey;
        private final Consumer<String> onChunk;
        private final StringBuilder buffer = new StringBuilder();
        private State state = State.SEEKING_KEY;
        private boolean escaped = false;

        JsonTextExtractor(String targetKey, Consumer<String> onChunk) {
            this.targetKey = "\"" + targetKey + "\"";
            this.onChunk = onChunk;
        }

        void feed(String token) {
            for (int i = 0; i < token.length(); i++) {
                char c = token.charAt(i);
                switch (state) {
                    case SEEKING_KEY:
                        buffer.append(c);
                        if (buffer.length() > targetKey.length()) {
                            buffer.deleteCharAt(0);
                        }
                        if (buffer.toString().equals(targetKey)) {
                            state = State.SEEKING_COLON;
                            buffer.setLength(0);
                        }
                        break;
                    case SEEKING_COLON:
                        if (c == ':') state = State.SEEKING_QUOTE;
                        break;
                    case SEEKING_QUOTE:
                        if (c == '"') { state = State.EMITTING; escaped = false; }
                        break;
                    case EMITTING:
                        if (escaped) {
                            if (c == 'n') onChunk.accept("\n");
                            else if (c == 't') onChunk.accept("\t");
                            else onChunk.accept(String.valueOf(c));
                            escaped = false;
                        } else if (c == '\\') {
                            escaped = true;
                        } else if (c == '"') {
                            state = State.DONE;
                        } else {
                            onChunk.accept(String.valueOf(c));
                        }
                        break;
                    case DONE:
                        break;
                }
            }
        }
    }

    public static class DialogueAiResult {
        public String speaker;
        public String emotion;
        public String text;
        public boolean allowFreeInput;
        public List<Choice> choices;
        public String sceneHint;

        public static class Choice {
            public int id;
            public String text;
            public int fateDelta;
            public int trustDelta;

            public Choice() {}
            public Choice(int id, String text, int fateDelta, int trustDelta) {
                this.id = id; this.text = text;
                this.fateDelta = fateDelta; this.trustDelta = trustDelta;
            }
        }
    }
}
