package com.iohao.mmo.story.ai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.volcengine.ark.runtime.model.completion.chat.ChatCompletionRequest;
import com.volcengine.ark.runtime.model.completion.chat.ChatMessage;
import com.volcengine.ark.runtime.model.completion.chat.ChatMessageRole;
import com.volcengine.ark.runtime.service.ArkService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import okhttp3.ConnectionPool;
import okhttp3.Dispatcher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * AI 对话服务 - 基于火山引擎豆包大模型
 * 用于驱动 NPC 实时对话生成
 */
@Slf4j
@Service
public class AiDialogueService {

    @Value("${volcengine.chat-api-key:3e2f9349-8892-4a67-ae9c-7e8fbd75f071}")
    private String apiKey;

    @Value("${volcengine.chat-model:doubao-pro-32k}")
    private String chatModel;

    private ArkService arkService;

    @PostConstruct
    public void init() {
        ConnectionPool connectionPool = new ConnectionPool(5, 1, TimeUnit.SECONDS);
        Dispatcher dispatcher = new Dispatcher();
        this.arkService = ArkService.builder()
                .dispatcher(dispatcher)
                .connectionPool(connectionPool)
                .apiKey(apiKey)
                .build();
        log.info("✅ AI对话服务初始化成功，模型: {}", chatModel);
    }

    /**
     * 生成 NPC 对话回复（结构化JSON输出）
     *
     * @param npcName      NPC名称
     * @param npcPersona   NPC人设描述
     * @param bookTitle    书籍世界名称
     * @param bookEra      时代背景
     * @param langStyle    语言风格（文言/白话/热血等）
     * @param keyFacts     与玩家的历史关键事实（最多5条）
     * @param fateScore    当前缘分值 0-100
     * @param playerInput  玩家当前输入（选项文字或自由文本）
     * @param historyText  近期对话历史（最多3轮）
     * @return DialogueAiResult 包含 text/emotion/choices/allowFreeInput
     */
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
            List<ChatMessage> messages = new ArrayList<>();
            messages.add(ChatMessage.builder()
                    .role(ChatMessageRole.SYSTEM)
                    .content(systemPrompt)
                    .build());
            messages.add(ChatMessage.builder()
                    .role(ChatMessageRole.USER)
                    .content(userPrompt)
                    .build());

            ChatCompletionRequest request = ChatCompletionRequest.builder()
                    .model(chatModel)
                    .messages(messages)
                    .maxTokens(512)
                    .temperature(0.8)
                    .build();

            var result = arkService.createChatCompletion(request);
            String content = result.getChoices().get(0).getMessage().getContent().toString().trim();

            log.debug("AI对话原始回复: {}", content);
            return parseAiResponse(content, npcName);

        } catch (Exception e) {
            log.warn("AI对话生成失败，使用fallback: {}", e.getMessage());
            return buildFallbackResponse(npcName, fateScore);
        }
    }

    /**
     * 构建 NPC 系统提示词（GDD 6.1 规范）
     */
    private String buildSystemPrompt(String npcName, String npcPersona, String bookTitle,
                                      String bookEra, String langStyle, List<String> keyFacts, int fateScore) {
        StringBuilder sb = new StringBuilder();
        sb.append("你扮演一个真实的角色扮演游戏 NPC，根据剧情和角色设定自然回应。\n");
        sb.append("角色设定：").append(npcName).append("，").append(npcPersona).append("\n");
        sb.append("当前时代背景：《").append(bookTitle).append("》").append(bookEra).append("\n");
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
        sb.append("  \"emotion\": \"calm/happy/sad/surprised/angry/shy/gentle/worried/playful/serious/melancholy/determined 之一\",\n");
        sb.append("  \"text\": \"NPC 说的话，不超过 80 字\",\n");
        sb.append("  \"choices\": [\n");
        sb.append("    {\"id\": 0, \"text\": \"选项文字（15字内）\", \"fate\": 缘分变化(-5到+10), \"trust\": 信任变化(-3到+5)},\n");
        sb.append("    {\"id\": 1, \"text\": \"选项文字\", \"fate\": N, \"trust\": N},\n");
        sb.append("    {\"id\": 2, \"text\": \"选项文字\", \"fate\": N, \"trust\": N}\n");
        sb.append("  ],\n");
        sb.append("  \"allow_free_input\": true\n");
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
            // 提取 JSON 部分（可能有前后多余文字）
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

    /** AI 对话结果数据结构 */
    public static class DialogueAiResult {
        public String speaker;
        public String emotion;
        public String text;
        public boolean allowFreeInput;
        public List<Choice> choices;

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
