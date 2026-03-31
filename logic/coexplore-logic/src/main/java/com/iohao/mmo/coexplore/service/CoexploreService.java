package com.iohao.mmo.coexplore.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iohao.mmo.coexplore.entity.CoexploreRound;
import com.iohao.mmo.coexplore.entity.CoexploreSession;
import com.iohao.mmo.coexplore.entity.CoexploreSession.ClueLocation;
import com.iohao.mmo.coexplore.repository.CoexploreSessionRepository;
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

import java.util.*;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class CoexploreService {

    @Resource
    CoexploreSessionRepository sessionRepository;

    @Value("${volcengine.chat-api-key:}")
    private String apiKey;

    @Value("${volcengine.chat-model:doubao-pro-32k}")
    private String chatModel;

    private ArkService arkService;

    @PostConstruct
    public void init() {
        if (apiKey != null && !apiKey.isBlank()) {
            this.arkService = ArkService.builder()
                    .dispatcher(new Dispatcher())
                    .connectionPool(new ConnectionPool(5, 1, TimeUnit.SECONDS))
                    .apiKey(apiKey)
                    .build();
        }
    }

    // ── 创建 / 加入 ──────────────────────────────────

    public CoexploreSession createSession(long hostId, String hostName) {
        CoexploreSession session = new CoexploreSession();
        session.setId(UUID.randomUUID().toString().substring(0, 8));
        session.setHostId(hostId);
        session.setHostName(hostName);
        session.setStatus("WAITING");
        session.setCurrentRound(0);
        session.setCreateTime(System.currentTimeMillis());
        return sessionRepository.save(session);
    }

    public CoexploreSession joinSession(String sessionId, long guestId, String guestName) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !"WAITING".equals(session.getStatus())) return null;
        if (session.getHostId() == guestId) return null;

        session.setGuestId(guestId);
        session.setGuestName(guestName);

        // AI 生成谜局剧本
        generateMystery(session);

        // 开始第一轮探索
        startRound(session, 1);
        return sessionRepository.save(session);
    }

    public CoexploreSession getSession(String sessionId) {
        return sessionRepository.findById(sessionId).orElse(null);
    }

    public List<CoexploreSession> listWaiting() {
        return sessionRepository.findByStatus("WAITING");
    }

    public CoexploreSession leaveSession(String sessionId, long playerId) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) return null;
        session.setStatus("COMPLETED");
        return sessionRepository.save(session);
    }

    // ── 探索阶段 ──────────────────────────────────

    public CoexploreSession explore(String sessionId, long playerId, String locationId) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !"EXPLORING".equals(session.getStatus())) return null;

        CoexploreRound round = getCurrentRound(session);
        if (round == null) return null;

        List<ClueLocation> locations = session.getCurrentRound() == 1
                ? session.getRound1Locations() : session.getRound2Locations();
        ClueLocation chosen = locations.stream()
                .filter(l -> l.getId().equals(locationId))
                .findFirst().orElse(null);
        if (chosen == null) return null;

        boolean isHost = playerId == session.getHostId();
        if (isHost) {
            if (round.getHostLocationId() != null) return session;
            round.setHostLocationId(locationId);
            round.setHostClue(chosen.getClueText());
            round.setHostTrace(chosen.getTrace());
        } else {
            if (round.getGuestLocationId() != null) return session;
            round.setGuestLocationId(locationId);
            round.setGuestClue(chosen.getClueText());
            round.setGuestTrace(chosen.getTrace());
        }

        // 双方都已选择
        if (round.getHostLocationId() != null && round.getGuestLocationId() != null) {
            boolean same = round.getHostLocationId().equals(round.getGuestLocationId());
            round.setSameLocation(same);

            // 缘分值：不同地点 +15，相同地点 +5
            int fate = same ? 5 : 15;
            round.setHostFateGain(fate);
            round.setGuestFateGain(fate);
            session.setHostFateValue(session.getHostFateValue() + fate);
            session.setGuestFateValue(session.getGuestFateValue() + fate);

            if (session.getCurrentRound() < 2) {
                startRound(session, session.getCurrentRound() + 1);
            } else {
                // 进入推理阶段
                session.setStatus("REASONING");
                session.setCurrentRound(3);
            }
        }

        return sessionRepository.save(session);
    }

    // ── 推理阶段 ──────────────────────────────────

    public CoexploreSession reason(String sessionId, long playerId, int answerIndex) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !"REASONING".equals(session.getStatus())) return null;
        if (answerIndex < 0 || answerIndex > 2) return null;

        boolean isHost = playerId == session.getHostId();
        if (isHost) {
            if (session.getHostAnswer() >= 0) return session;
            session.setHostAnswer(answerIndex);
        } else {
            if (session.getGuestAnswer() >= 0) return session;
            session.setGuestAnswer(answerIndex);
        }

        // 双方都已作答
        if (session.getHostAnswer() >= 0 && session.getGuestAnswer() >= 0) {
            boolean hostCorrect = session.getHostAnswer() == session.getCorrectAnswer();
            boolean guestCorrect = session.getGuestAnswer() == session.getCorrectAnswer();
            boolean sameAnswer = session.getHostAnswer() == session.getGuestAnswer();

            String result;
            int bossHp;
            if (sameAnswer && hostCorrect) {
                result = "PERFECT";
                bossHp = 120;
            } else if (sameAnswer) {
                result = "CONSENSUS";
                bossHp = 200;
            } else if (hostCorrect || guestCorrect) {
                result = "SPLIT";
                bossHp = 200;
            } else {
                result = "LOST";
                bossHp = 300;
            }
            session.setReasoningResult(result);

            // 推理缘分奖励
            int matchBonus = sameAnswer ? 20 : 0;
            int correctBonus = 15;
            session.setHostFateValue(session.getHostFateValue() + matchBonus + (hostCorrect ? correctBonus : 0));
            session.setGuestFateValue(session.getGuestFateValue() + matchBonus + (guestCorrect ? correctBonus : 0));

            // 进入 Boss 战
            session.setStatus("BOSS");
            session.setBossHp(bossHp);
            session.setBossDamageHost(0);
            session.setBossDamageGuest(0);
        }

        return sessionRepository.save(session);
    }

    // ── Boss 战 ──────────────────────────────────

    public CoexploreSession bossBattle(String sessionId, long playerId) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !"BOSS".equals(session.getStatus())) return null;

        boolean isHost = playerId == session.getHostId();
        int fateValue = isHost ? session.getHostFateValue() : session.getGuestFateValue();

        int damage = 30 + fateValue / 5;
        if (isHost) {
            session.setBossDamageHost(session.getBossDamageHost() + damage);
        } else {
            session.setBossDamageGuest(session.getBossDamageGuest() + damage);
        }

        int totalDamage = session.getBossDamageHost() + session.getBossDamageGuest();
        if (totalDamage >= session.getBossHp()) {
            session.setStatus("COMPLETED");
        }

        return sessionRepository.save(session);
    }

    // ── 内部方法 ──────────────────────────────────

    private void startRound(CoexploreSession session, int roundNum) {
        session.setCurrentRound(roundNum);
        session.setStatus("EXPLORING");
        CoexploreRound round = new CoexploreRound();
        round.setRound(roundNum);
        session.getRounds().add(round);
    }

    private CoexploreRound getCurrentRound(CoexploreSession session) {
        List<CoexploreRound> rounds = session.getRounds();
        if (rounds == null || rounds.isEmpty()) return null;
        return rounds.get(rounds.size() - 1);
    }

    // ── AI 谜局生成 ──────────────────────────────────

    private void generateMystery(CoexploreSession session) {
        if (arkService == null) {
            applyFallbackMystery(session);
            return;
        }

        String prompt = """
                你是书境谜局的设计师。为两位探索者生成一个古风悬疑谜局。

                要求：
                1. 案件背景（80-120字）：一个发生在古风世界中的悬疑事件，有明确的谜题
                2. 三个嫌疑对象/答案，每个用20-30字描述，其中只有一个是真相
                3. 正确答案的编号（0/1/2）
                4. 第一轮4个探索地点和第二轮4个探索地点（共8个）

                线索设计规则：
                - 指向正确答案的关键线索要分散在不同地点，单独看一条不够，两条合在一起才能推理出真相
                - 每轮4个地点中，至少2个地点有指向真相的线索碎片
                - 干扰线索要有一定合理性，能指向错误嫌疑人但不如真线索完整
                - 第一轮线索较为表面，第二轮线索更深入关键
                - 痕迹是模糊提示，暗示这个地点可能有什么，帮助对方决策

                严格按JSON格式返回，不要输出其他内容：
                {
                  "background": "案件背景...",
                  "suspects": ["嫌疑人A描述", "嫌疑人B描述", "嫌疑人C描述"],
                  "correctAnswer": 0,
                  "round1": [
                    {"id": "r1_1", "name": "≤4字地点名", "description": "20-30字场景", "clue": "20-40字线索", "trace": "10-20字痕迹"},
                    {"id": "r1_2", "name": "...", "description": "...", "clue": "...", "trace": "..."},
                    {"id": "r1_3", "name": "...", "description": "...", "clue": "...", "trace": "..."},
                    {"id": "r1_4", "name": "...", "description": "...", "clue": "...", "trace": "..."}
                  ],
                  "round2": [
                    {"id": "r2_1", "name": "...", "description": "...", "clue": "...", "trace": "..."},
                    {"id": "r2_2", "name": "...", "description": "...", "clue": "...", "trace": "..."},
                    {"id": "r2_3", "name": "...", "description": "...", "clue": "...", "trace": "..."},
                    {"id": "r2_4", "name": "...", "description": "...", "clue": "...", "trace": "..."}
                  ]
                }""";

        try {
            List<ChatMessage> messages = List.of(
                    ChatMessage.builder()
                            .role(ChatMessageRole.SYSTEM)
                            .content("你是古风悬疑谜局设计大师。生成的谜局要逻辑自洽、线索互补、可推理。只输出JSON。")
                            .build(),
                    ChatMessage.builder()
                            .role(ChatMessageRole.USER)
                            .content(prompt)
                            .build()
            );

            ChatCompletionRequest request = ChatCompletionRequest.builder()
                    .model(chatModel)
                    .messages(messages)
                    .maxTokens(1024)
                    .temperature(0.9)
                    .build();

            var result = arkService.createChatCompletion(request);
            String text = result.getChoices().get(0).getMessage().getContent().toString().trim();
            log.debug("谜局AI回复: {}", text);
            parseMystery(session, text);
        } catch (Exception e) {
            log.error("AI生成谜局失败，使用兜底: {}", e.getMessage());
            applyFallbackMystery(session);
        }
    }

    private void parseMystery(CoexploreSession session, String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) {
            applyFallbackMystery(session);
            return;
        }
        JSONObject json = JSON.parseObject(text.substring(start, end + 1));

        session.setMysteryBackground(json.getString("background"));
        session.setSuspects(json.getJSONArray("suspects").toJavaList(String.class));
        session.setCorrectAnswer(json.getIntValue("correctAnswer"));
        session.setRound1Locations(parseLocations(json.getJSONArray("round1")));
        session.setRound2Locations(parseLocations(json.getJSONArray("round2")));
    }

    private List<ClueLocation> parseLocations(JSONArray arr) {
        List<ClueLocation> list = new ArrayList<>();
        for (int i = 0; i < arr.size(); i++) {
            JSONObject o = arr.getJSONObject(i);
            ClueLocation loc = new ClueLocation();
            loc.setId(o.getString("id"));
            loc.setName(o.getString("name"));
            loc.setDescription(o.getString("description"));
            loc.setClueText(o.getString("clue"));
            loc.setTrace(o.getString("trace"));
            list.add(loc);
        }
        return list;
    }

    // ── 兜底谜局 ──────────────────────────────────

    private void applyFallbackMystery(CoexploreSession session) {
        session.setMysteryBackground("清河镇李大夫离奇失踪，药堂被翻得凌乱不堪。"
                + "镇上传言纷纷，三人嫌疑最大：他的徒弟、老对手、以及一位神秘过客。"
                + "真相到底是什么？");
        session.setSuspects(List.of(
                "徒弟赵安——跟师五年，近来频繁与外人接触，行迹可疑",
                "对手钱伯——与李大夫争了半辈子，最近生意惨淡",
                "过客孙旅——三日前入镇，自称游医，对药材异常熟悉"
        ));
        session.setCorrectAnswer(2);

        session.setRound1Locations(List.of(
                buildLoc("r1_1", "药堂", "药柜倒了半边，地上散落着碎瓷瓶", "药柜深处藏着一封未拆的信，来自远方一个叫'孙'的人", "空气中残留着一股陌生药草的气味"),
                buildLoc("r1_2", "后院", "院中水缸被移动过，地面有拖拽痕迹", "水缸下有个暗格，里面是空的，但有新鲜刮痕", "水缸旁有一只不属于本镇的草鞋印"),
                buildLoc("r1_3", "茶馆", "镇上消息最灵通的地方", "掌柜说李大夫失踪前一晚，有人在药堂附近徘徊到深夜", "赵安最近经常来这里，但都是独自一人"),
                buildLoc("r1_4", "钱伯药铺", "门庭冷落，钱伯面色不善", "钱伯的药材清单上有几味罕见的药，和李大夫的配方重合", "钱伯的伙计说主人昨夜很早就睡了")
        ));
        session.setRound2Locations(List.of(
                buildLoc("r2_1", "驿站", "南来北往的旅人歇脚处", "客簿记载三日前一位'孙姓游医'入住，登记的籍贯是假的", "驿站小二说那位客人总在深夜外出"),
                buildLoc("r2_2", "药山", "镇外采药的山坡", "山上发现新挖的药坑，挖走的是一味极珍贵的药材，李大夫正在研制的秘方需要它", "有两组脚印——一组匆忙，一组从容"),
                buildLoc("r2_3", "赵安住所", "简朴的小屋，摆满医书", "赵安确实在和外人联络——但内容是他准备离开师门、自立药堂", "医书上的笔记很用心，赵安对师父有感恩之情"),
                buildLoc("r2_4", "河边码头", "清河镇的水路出口", "码头苦力说失踪当夜有人雇船急走，带着一个大木箱，给了三倍船资", "那人用布巾蒙面，但口音不是本地的")
        ));
    }

    private ClueLocation buildLoc(String id, String name, String desc, String clue, String trace) {
        ClueLocation loc = new ClueLocation();
        loc.setId(id);
        loc.setName(name);
        loc.setDescription(desc);
        loc.setClueText(clue);
        loc.setTrace(trace);
        return loc;
    }
}
