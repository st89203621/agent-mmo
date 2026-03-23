package com.iohao.mmo.bookworld.explore;

import com.iohao.mmo.bookworld.repository.ExploreEventRepository;
import com.iohao.mmo.bookworld.repository.ExploreStateRepository;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.volcengine.ark.runtime.model.completion.chat.ChatCompletionRequest;
import com.volcengine.ark.runtime.model.completion.chat.ChatMessage;
import com.volcengine.ark.runtime.model.completion.chat.ChatMessageRole;
import com.volcengine.ark.runtime.service.ArkService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import okhttp3.ConnectionPool;
import okhttp3.Dispatcher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class ExploreService {

    private static final int MAX_ACTION_POINTS = 10;
    private static final long RECOVER_INTERVAL_SEC = 1800; // 30分钟

    @Value("${volcengine.chat-api-key:}")
    private String apiKey;

    @Value("${volcengine.chat-model:doubao-pro-32k}")
    private String chatModel;

    @Resource
    private ExploreStateRepository stateRepository;

    @Resource
    private ExploreEventRepository eventRepository;

    private ArkService arkService;

    @PostConstruct
    public void init() {
        if (apiKey != null && !apiKey.isBlank()) {
            this.arkService = ArkService.builder()
                    .dispatcher(new Dispatcher())
                    .connectionPool(new ConnectionPool(5, 1, TimeUnit.SECONDS))
                    .apiKey(apiKey)
                    .build();
            log.info("ExploreService AI服务初始化成功");
        }
    }

    /**
     * 获取探索状态（自动恢复行动力）
     */
    public Map<String, Object> getStatus(long userId) {
        ExploreState state = getOrCreateState(userId);
        recoverActionPoints(state);
        stateRepository.save(state);

        long nextRecoverSec = 0;
        if (state.getActionPoints() < MAX_ACTION_POINTS) {
            long elapsed = Instant.now().getEpochSecond() - state.getLastRecoverTime().getEpochSecond();
            nextRecoverSec = Math.max(0, RECOVER_INTERVAL_SEC - (elapsed % RECOVER_INTERVAL_SEC));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("actionPoints", state.getActionPoints());
        result.put("maxPoints", MAX_ACTION_POINTS);
        result.put("nextRecoverSec", nextRecoverSec);
        result.put("todayCount", state.getTodayExploreCount());
        return result;
    }

    /**
     * 执行一次探索：消耗行动力 → AI生成事件 → 返回事件数据
     */
    public ExploreEvent explore(long userId, int worldIndex, String bookTitle) {
        if (arkService == null) {
            throw new RuntimeException("AI服务未初始化");
        }

        ExploreState state = getOrCreateState(userId);
        recoverActionPoints(state);

        if (state.getActionPoints() <= 0) {
            throw new RuntimeException("行动力不足，请稍后再试");
        }

        // 消耗行动力
        state.setActionPoints(state.getActionPoints() - 1);
        String today = LocalDate.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.ISO_DATE);
        if (!today.equals(state.getLastExploreDate())) {
            state.setTodayExploreCount(0);
            state.setLastExploreDate(today);
        }
        state.setTodayExploreCount(state.getTodayExploreCount() + 1);
        stateRepository.save(state);

        // AI生成事件
        ExploreEvent event = generateEvent(userId, bookTitle);
        eventRepository.save(event);
        return event;
    }

    /**
     * 解决事件选择 → 计算奖励
     */
    public Map<String, Object> resolveChoice(long userId, String eventId, int choiceId) {
        ExploreEvent event = eventRepository.findByEventId(eventId)
                .orElseThrow(() -> new RuntimeException("事件不存在"));

        if (event.getUserId() != userId) {
            throw new RuntimeException("无权操作此事件");
        }
        if (event.isResolved()) {
            throw new RuntimeException("事件已解决");
        }

        // 找到选择
        ExploreEvent.Choice chosen = event.getChoices().stream()
                .filter(c -> c.getId() == choiceId)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("无效选择"));

        event.setResolved(true);
        eventRepository.save(event);

        // 根据事件类型和风险计算奖励
        return calculateReward(event, chosen);
    }

    /**
     * 获取已完成的探索事件历史
     */
    public List<ExploreEvent> getHistory(long userId) {
        return eventRepository.findByUserIdAndResolvedTrueOrderByCreateTimeDesc(userId);
    }

    // ── 内部方法 ──────────────────────────────────────

    private ExploreState getOrCreateState(long userId) {
        return stateRepository.findByUserId(userId).orElseGet(() -> {
            ExploreState s = new ExploreState();
            s.setUserId(userId);
            s.setActionPoints(MAX_ACTION_POINTS);
            s.setLastRecoverTime(Instant.now());
            s.setTodayExploreCount(0);
            s.setLastExploreDate(LocalDate.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.ISO_DATE));
            return stateRepository.save(s);
        });
    }

    private void recoverActionPoints(ExploreState state) {
        if (state.getActionPoints() >= MAX_ACTION_POINTS) return;

        long elapsedSec = Instant.now().getEpochSecond() - state.getLastRecoverTime().getEpochSecond();
        int recovered = (int) (elapsedSec / RECOVER_INTERVAL_SEC);
        if (recovered > 0) {
            state.setActionPoints(Math.min(MAX_ACTION_POINTS, state.getActionPoints() + recovered));
            state.setLastRecoverTime(state.getLastRecoverTime().plus(recovered * RECOVER_INTERVAL_SEC, ChronoUnit.SECONDS));
        }
    }

    /**
     * 将战斗ID关联到探索事件
     */
    public void linkBattle(String eventId, String battleId) {
        ExploreEvent event = eventRepository.findByEventId(eventId)
                .orElseThrow(() -> new RuntimeException("事件不存在"));
        event.setBattleId(battleId);
        eventRepository.save(event);
    }

    /**
     * 根据战斗结果结算遭遇战奖励
     */
    public Map<String, Object> resolveCombat(long userId, String eventId, boolean victory) {
        ExploreEvent event = eventRepository.findByEventId(eventId)
                .orElseThrow(() -> new RuntimeException("事件不存在"));
        if (event.getUserId() != userId) throw new RuntimeException("无权操作");
        if (event.isResolved()) throw new RuntimeException("事件已解决");

        event.setResolved(true);
        eventRepository.save(event);

        ThreadLocalRandom rand = ThreadLocalRandom.current();
        Map<String, Object> reward = new LinkedHashMap<>();
        if (victory) {
            int fateDelta = rand.nextInt(3, 8);
            int trustDelta = rand.nextInt(2, 5);
            String itemName = rand.nextInt(3) == 0 ? "战利品" : null;
            reward.put("message", "击败了「" + event.getEnemyName() + "」！缘分 +" + fateDelta + "，信任 +" + trustDelta);
            reward.put("fateDelta", fateDelta);
            reward.put("trustDelta", trustDelta);
            reward.put("itemName", itemName);
            reward.put("memoryTitle", null);
            reward.put("imageUrl", null);
        } else {
            reward.put("message", "败给了「" + event.getEnemyName() + "」，狼狈撤退...");
            reward.put("fateDelta", -1);
            reward.put("trustDelta", 0);
            reward.put("itemName", null);
            reward.put("memoryTitle", null);
            reward.put("imageUrl", null);
        }
        return reward;
    }

    private ExploreEvent generateEvent(long userId, String bookTitle) {
        // combat 出现概率约 30%（6种类型中占2权重）
        String[] types = {"encounter", "discovery", "lore", "dilemma", "vista", "combat", "combat"};
        String randomType = types[ThreadLocalRandom.current().nextInt(types.length)];

        String prompt = String.format("""
                你是「%s」世界的命运织者。玩家正在书中漫步探索。
                根据这部作品的世界观和氛围，生成一个探索事件。

                要求生成类型为: %s
                事件类型说明：
                - encounter（奇遇）：偶遇某角色的片段场景，短对话+选择
                - discovery（拾遗）：发现散落的物件或宝物
                - lore（秘闻）：窥见世界的隐秘一角
                - dilemma（抉择）：面临道德/策略两难
                - vista（奇景）：邂逅壮丽/诡异/温馨场景
                - combat（遭遇战）：遭遇敌人/妖兽/邪修，需要战斗

                严格按JSON格式返回，不要输出其他内容：
                {
                  "type": "%s",
                  "title": "≤8字标题",
                  "description": "40-80字场景描述，用该书的语言风格",
                  "choices": [
                    {"id": 0, "text": "≤12字选项", "risk": "low或medium或high"},
                    {"id": 1, "text": "≤12字选项", "risk": "low或medium或high"}
                  ],
                  "npcId": null,
                  "sceneHint": "≤10字画面描述（仅vista类型需要，其他为null）",
                  "enemyName": "≤6字敌人名称（仅combat类型需要，其他为null）"
                }""", bookTitle, randomType, randomType);

        try {
            List<ChatMessage> messages = List.of(
                    ChatMessage.builder()
                            .role(ChatMessageRole.SYSTEM)
                            .content("你是一个中文小说世界的叙事大师，擅长根据小说世界观生成沉浸式探索事件。只输出JSON。")
                            .build(),
                    ChatMessage.builder()
                            .role(ChatMessageRole.USER)
                            .content(prompt)
                            .build()
            );

            ChatCompletionRequest request = ChatCompletionRequest.builder()
                    .model(chatModel)
                    .messages(messages)
                    .maxTokens(512)
                    .temperature(0.85)
                    .build();

            var result = arkService.createChatCompletion(request);
            String responseText = result.getChoices().get(0).getMessage().getContent().toString().trim();
            log.debug("探索事件AI回复: {}", responseText);

            return parseEvent(userId, responseText);

        } catch (Exception e) {
            log.error("AI生成探索事件失败: {}", e.getMessage(), e);
            // 兜底：生成一个默认事件
            return buildFallbackEvent(userId, randomType, bookTitle);
        }
    }

    private ExploreEvent parseEvent(long userId, String responseText) {
        int start = responseText.indexOf('{');
        int end = responseText.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new RuntimeException("AI返回格式异常");
        }
        JSONObject json = JSON.parseObject(responseText.substring(start, end + 1));

        ExploreEvent event = new ExploreEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setUserId(userId);
        event.setType(json.getString("type"));
        event.setTitle(json.getString("title"));
        event.setDescription(json.getString("description"));
        event.setNpcId(json.getString("npcId"));
        event.setSceneHint(json.getString("sceneHint"));
        event.setEnemyName(json.getString("enemyName"));
        event.setResolved(false);

        List<ExploreEvent.Choice> choices = new ArrayList<>();
        JSONArray arr = json.getJSONArray("choices");
        if (arr != null) {
            for (int i = 0; i < arr.size(); i++) {
                JSONObject cj = arr.getJSONObject(i);
                ExploreEvent.Choice c = new ExploreEvent.Choice();
                c.setId(cj.getIntValue("id"));
                c.setText(cj.getString("text"));
                c.setRisk(cj.getString("risk"));
                choices.add(c);
            }
        }
        event.setChoices(choices);
        return event;
    }

    private ExploreEvent buildFallbackEvent(long userId, String type, String bookTitle) {
        ExploreEvent event = new ExploreEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setUserId(userId);
        event.setType(type);
        event.setResolved(false);

        switch (type) {
            case "encounter" -> {
                event.setTitle("故人重逢");
                event.setDescription("你在古道旁遇到一位面容模糊的旅人，对方似乎认识你，微微颔首示意。空气中弥漫着说不清的熟悉感。");
            }
            case "discovery" -> {
                event.setTitle("残卷遗珠");
                event.setDescription("草丛间露出半截锦帛，上面的字迹虽已褪色，却隐隐透出一股灵力波动，仿佛在等待有缘人拾取。");
            }
            case "lore" -> {
                event.setTitle("碑铭密语");
                event.setDescription("路旁石碑上刻满了古老文字，大多已模糊不清，唯有最后一行清晰可辨：「此处曾是…」后面的字却被人刻意抹去。");
            }
            case "dilemma" -> {
                event.setTitle("岔路抉择");
                event.setDescription("前方路分两条：左边传来隐约的求救声，右边飘来诱人的灵果清香。时间紧迫，你只能选择一条路。");
            }
            case "combat" -> {
                event.setTitle("林间伏兵");
                event.setDescription("密林深处传来低沉的咆哮，树叶簌簌而落。一头浑身漆黑的妖兽从暗处窜出，血红的双目死死盯住了你。");
                event.setEnemyName("暗影妖兽");
            }
            default -> {
                event.setTitle("云海奇观");
                event.setDescription("山巅之上，云海翻涌如浪。日光穿透云层洒下万道金芒，远处隐约浮现出一座倒悬的楼阁，转瞬即逝。");
                event.setSceneHint("云海金光倒悬楼阁");
            }
        }

        List<ExploreEvent.Choice> choices = new ArrayList<>();
        ExploreEvent.Choice c0 = new ExploreEvent.Choice();
        c0.setId(0);
        ExploreEvent.Choice c1 = new ExploreEvent.Choice();
        c1.setId(1);

        if ("combat".equals(type)) {
            c0.setText("拔剑迎战");
            c0.setRisk("medium");
            c1.setText("转身逃跑");
            c1.setRisk("low");
        } else {
            c0.setText("上前探查");
            c0.setRisk("low");
            c1.setText("谨慎绕行");
            c1.setRisk("low");
        }
        choices.add(c0);
        choices.add(c1);

        event.setChoices(choices);
        return event;
    }

    private Map<String, Object> calculateReward(ExploreEvent event, ExploreEvent.Choice chosen) {
        ThreadLocalRandom rand = ThreadLocalRandom.current();
        int riskMultiplier = switch (chosen.getRisk()) {
            case "high" -> 3;
            case "medium" -> 2;
            default -> 1;
        };

        int fateDelta = 0;
        int trustDelta = 0;
        String itemName = null;
        String memoryTitle = null;
        String message;
        String imageUrl = null;

        switch (event.getType()) {
            case "encounter" -> {
                fateDelta = rand.nextInt(1, 4) * riskMultiplier;
                trustDelta = rand.nextInt(1, 3) * riskMultiplier;
                message = "缘分 +" + fateDelta + "，信任 +" + trustDelta;
            }
            case "discovery" -> {
                fateDelta = rand.nextInt(1, 3);
                itemName = "神秘物件";
                message = "获得了一件「" + itemName + "」，缘分 +" + fateDelta;
            }
            case "lore" -> {
                memoryTitle = event.getTitle();
                fateDelta = rand.nextInt(1, 3);
                message = "获得记忆碎片「" + memoryTitle + "」，缘分 +" + fateDelta;
            }
            case "dilemma" -> {
                fateDelta = rand.nextInt(2, 6) * riskMultiplier * (rand.nextBoolean() ? 1 : -1);
                trustDelta = rand.nextInt(1, 4) * (fateDelta > 0 ? 1 : -1);
                message = "缘分 " + (fateDelta >= 0 ? "+" : "") + fateDelta
                        + "，信任 " + (trustDelta >= 0 ? "+" : "") + trustDelta;
            }
            case "vista" -> {
                fateDelta = rand.nextInt(1, 3);
                message = "记录下了这壮丽景象，缘分 +" + fateDelta;
            }
            case "combat" -> {
                // 选择逃跑时走这里（迎战走 resolveCombat）
                fateDelta = -1;
                message = "你选择了逃离战场，缘分 -1";
            }
            default -> {
                fateDelta = 1;
                message = "缘分 +1";
            }
        }

        Map<String, Object> reward = new LinkedHashMap<>();
        reward.put("message", message);
        reward.put("fateDelta", fateDelta);
        reward.put("trustDelta", trustDelta);
        reward.put("itemName", itemName);
        reward.put("memoryTitle", memoryTitle);
        reward.put("imageUrl", imageUrl);
        return reward;
    }
}
