package com.iohao.mmo.api;

import com.alibaba.fastjson2.JSON;
import com.iohao.mmo.bookworld.entity.BookWorld;
import com.iohao.mmo.bookworld.service.BookCrawlService;
import com.iohao.mmo.bookworld.service.BookRagService;
import com.iohao.mmo.bookworld.service.BookWorldService;
import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.entity.Relation;
import com.iohao.mmo.fate.repository.NpcTemplateRepository;
import com.iohao.mmo.fate.repository.RelationRepository;
import com.iohao.mmo.fate.service.FateService;
import com.iohao.mmo.login.entity.User;
import com.iohao.mmo.login.service.UserService;
import com.iohao.mmo.memory.entity.MemoryFragment;
import com.iohao.mmo.memory.service.MemoryService;
import com.iohao.mmo.rebirth.service.RebirthService;
import com.iohao.mmo.story.entity.DialogueSession;
import com.iohao.mmo.story.proto.DialogueMessage;
import com.iohao.mmo.story.service.StoryService;
import com.iohao.mmo.equip.entity.ElseEquipProperty;
import com.iohao.mmo.equip.entity.Equip;
import com.iohao.mmo.equip.entity.FixedEquipProperty;
import com.iohao.mmo.equip.service.EquipService;
import com.iohao.mmo.bag.entity.Bag;
import com.iohao.mmo.bag.entity.BagItem;
import com.iohao.mmo.bag.service.BagService;
import com.iohao.mmo.quest.entity.Quest;
import com.iohao.mmo.quest.service.QuestService;
import com.iohao.mmo.person.entity.Person;
import com.iohao.mmo.person.service.PersonService;
import com.iohao.mmo.pet.entity.Pet;
import com.iohao.mmo.pet.entity.PetTemplate;
import com.iohao.mmo.pet.proto.CreatePetMessage;
import com.iohao.mmo.pet.service.PetService;
import com.iohao.mmo.skill.entity.SkillTemplate;
import com.iohao.mmo.skill.entity.PlayerSkill;
import com.iohao.mmo.skill.service.SkillService;
import com.iohao.mmo.battle.entity.BattleAction;
import com.iohao.mmo.battle.entity.BattleState;
import com.iohao.mmo.battle.entity.BattleUnit;
import com.iohao.mmo.battle.service.BattleService;
import com.iohao.mmo.level.entity.Level;
import com.iohao.mmo.level.entity.PersonLevelConfig;
import com.iohao.mmo.level.service.LevelService;
import com.iohao.mmo.shop.entity.ShopItem;
import com.iohao.mmo.shop.entity.PlayerCurrency;
import com.iohao.mmo.shop.entity.PurchaseHistory;
import com.iohao.mmo.shop.service.ShopService;
import com.iohao.mmo.enchant.entity.EnchantRune;
import com.iohao.mmo.enchant.entity.EquipEnchant;
import com.iohao.mmo.enchant.service.EnchantService;
import com.iohao.mmo.adventure.entity.Dungeon;
import com.iohao.mmo.adventure.service.AdventureService;
import com.iohao.mmo.rank.entity.RankEntry;
import com.iohao.mmo.rank.service.RankService;
import com.iohao.mmo.bookworld.explore.ExploreEvent;
import com.iohao.mmo.bookworld.explore.ExploreService;
import com.iohao.mmo.chat.entity.ChatRecord;
import com.iohao.mmo.chat.service.ChatService;
import com.iohao.mmo.coexplore.entity.CoexploreSession;
import com.iohao.mmo.coexplore.entity.CoexploreRound;
import com.iohao.mmo.coexplore.service.CoexploreService;
import com.iohao.mmo.companion.entity.CompanionBag;
import com.iohao.mmo.companion.entity.SpiritCompanion;
import com.iohao.mmo.companion.service.CompanionService;
import com.iohao.mmo.event.entity.LuckyWheelEvent;
import com.iohao.mmo.event.entity.WorldBossEvent;
import com.iohao.mmo.event.service.LuckyWheelEventService;
import com.iohao.mmo.event.service.WorldBossEventService;
import com.iohao.mmo.pet.entity.PetBag;
import com.iohao.mmo.story.entity.SceneImage;
import com.iohao.mmo.story.service.SceneImageService;
import com.iohao.mmo.auction.service.AuctionService;
import com.iohao.mmo.map.zone.ZoneService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 前端 REST API 桥接层
 * 让 Phaser3 前端可通过标准 HTTP/JSON 访问游戏服务，无需实现 ioGame 二进制协议
 * CORS 由 StaticResourceConfig 全局配置处理（allowedOriginPatterns + allowCredentials）
 */
@Slf4j
@RestController
@RequestMapping("/api")
public class GameApiController {

    @Resource
    UserService userService;

    @Resource
    StoryService storyService;

    @Resource
    FateService fateService;

    @Resource
    RebirthService rebirthService;

    @Resource
    BookWorldService bookWorldService;

    @Resource
    BookRagService bookRagService;

    @Resource
    BookCrawlService bookCrawlService;

    @Resource
    MemoryService memoryService;

    @Resource
    NpcTemplateRepository npcTemplateRepository;

    @Resource
    EquipService equipService;

    @Resource
    PersonService personService;

    @Resource
    BagService bagService;

    @Resource
    QuestService questService;

    @Resource
    PetService petService;

    @Resource
    SkillService skillService;

    @Resource
    BattleService battleService;

    @Resource
    LevelService levelService;

    @Resource
    ShopService shopService;

    @Resource
    EnchantService enchantService;

    @Resource
    AdventureService adventureService;

    @Resource
    RankService rankService;

    @Resource
    CompanionService companionService;

    @Resource
    SceneImageService sceneImageService;

    @Resource
    org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    @Resource
    ExploreService exploreService;

    @Resource
    ChatService chatService;

    @Resource
    RelationRepository relationRepository;

    @Resource
    com.iohao.mmo.title.service.TitleService titleService;

    @Resource
    com.iohao.mmo.guild.service.GuildService guildService;

    @Resource
    com.iohao.mmo.treasure.service.TreasureMountainService treasureMountainService;

    @Resource
    com.iohao.mmo.flower.service.FlowerService flowerService;

    @Resource
    com.iohao.mmo.trade.service.TradeService tradeService;

    @Resource
    com.iohao.mmo.teambattle.service.TeamBattleService teamBattleService;

    @Resource
    CoexploreService coexploreService;

    @Resource
    LuckyWheelEventService luckyWheelEventService;

    @Resource
    WorldBossEventService worldBossEventService;

    @Resource
    AuctionService auctionService;

    @Resource
    ZoneService zoneService;

    /** 留言板：zoneId→messages (in-memory) */
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<Map<String, Object>>> boardMessages = new ConcurrentHashMap<>();
    /** 婚姻关系：playerId→{partnerId, partnerName, createdAt} */
    private final ConcurrentHashMap<Long, Map<String, Object>> marriageMap = new ConcurrentHashMap<>();
    /** 求婚请求：targetId→{fromId, fromName, createdAt} */
    private final ConcurrentHashMap<Long, Map<String, Object>> proposeMap = new ConcurrentHashMap<>();
    /** 好友列表：playerId -> friends */
    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<Map<String, Object>>> friendMap = new ConcurrentHashMap<>();
    /** 邮件列表：playerId -> mails */
    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<Map<String, Object>>> mailMap = new ConcurrentHashMap<>();
    /** 集市挂单：listingId -> listing */
    private final ConcurrentHashMap<String, Map<String, Object>> marketListings = new ConcurrentHashMap<>();

    private final ExecutorService sseExecutor = Executors.newCachedThreadPool();

    /** 共探 SSE 推送：sessionId → (userId → emitter) */
    private final ConcurrentHashMap<String, ConcurrentHashMap<Long, SseEmitter>> coexploreEmitters = new ConcurrentHashMap<>();

    /** 共探大厅 SSE 推送：所有在大厅界面的用户 */
    private final ConcurrentHashMap<Long, SseEmitter> coexploreLobbyEmitters = new ConcurrentHashMap<>();

    // ── 认证 ─────────────────────────────────────────

    @PostMapping("/auth/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body, HttpSession session) {
        User user = userService.register(body.get("username"), body.get("password"));
        session.setAttribute("userId", user.getId());
        session.setAttribute("username", user.getUsername());
        return ok(Map.of("userId", user.getId(), "username", user.getUsername(), "nickname", user.getNickname()));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body, HttpSession session) {
        try {
            User user = userService.verifyLogin(body.get("username"), body.get("password"));
            session.setAttribute("userId", user.getId());
            session.setAttribute("username", user.getUsername());
            return ok(Map.of("userId", user.getId(), "username", user.getUsername(), "nickname", user.getNickname()));
        } catch (Exception e) {
            return err("用户名或密码错误");
        }
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpSession session) {
        session.invalidate();
        return ok(Map.of("msg", "已退出"));
    }

    @GetMapping("/auth/me")
    public ResponseEntity<Map<String, Object>> me(HttpSession session) {
        long userId = requireLogin(session);
        return ok(Map.of("userId", userId, "username", session.getAttribute("username")));
    }

    // ── 剧情对话 ──────────────────────────────────────

    @PostMapping("/story/start")
    public ResponseEntity<Map<String, Object>> startDialogue(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String npcId = (String) body.get("npcId");
        int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();

        DialogueSession sess = storyService.startDialogue(userId, npcId, worldIndex);

        // 恢复的历史对话：返回历史消息 + 最后一条NPC消息的choices
        if (storyService.isResumedSession(sess)) {
            List<Map<String, Object>> history = storyService.getSessionHistory(sess.getId());
            Map<String, Object> result = new HashMap<>();
            result.put("sessionId", sess.getId());
            result.put("resumed", true);
            result.put("history", history);
            if (!history.isEmpty()) {
                Map<String, Object> lastNpc = null;
                for (int i = history.size() - 1; i >= 0; i--) {
                    if ("npc".equals(history.get(i).get("role"))) { lastNpc = history.get(i); break; }
                }
                if (lastNpc != null) {
                    result.put("speaker", lastNpc.get("speaker"));
                    result.put("emotion", lastNpc.get("emotion"));
                    result.put("text", lastNpc.get("text"));
                    result.put("choicesJson", lastNpc.get("choicesJson"));
                    result.put("allowFreeInput", true);
                }
            }
            result.putIfAbsent("speaker", npcId);
            result.putIfAbsent("emotion", "calm");
            result.putIfAbsent("text", "");
            result.putIfAbsent("choicesJson", "[]");
            result.putIfAbsent("allowFreeInput", true);
            result.put("fateDelta", 0);
            result.put("trustDelta", 0);
            return ok(result);
        }

        // 新对话：生成开场白
        DialogueMessage opening = storyService.getOpeningLine(sess.getId());
        return ok(dialogueToMap(sess.getId(), opening));
    }

    @PostMapping("/story/choice")
    public ResponseEntity<Map<String, Object>> sendChoice(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String sessionId = (String) body.get("sessionId");
        int choiceId = ((Number) body.get("choiceId")).intValue();
        String npcId = (String) body.getOrDefault("npcId", "");
        int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();

        DialogueMessage reply = storyService.processChoice(sessionId, choiceId);
        if (reply != null && reply.fateDelta != 0) {
            try { fateService.applyChoice(userId, npcId, worldIndex, reply.fateDelta, reply.trustDelta); } catch (Exception ignored) {}
        }
        return ok(dialogueToMap(sessionId, reply));
    }

    @PostMapping("/story/input")
    public ResponseEntity<Map<String, Object>> sendFreeInput(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String sessionId = (String) body.get("sessionId");
        String text = (String) body.get("text");
        String npcId = (String) body.getOrDefault("npcId", "");
        int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();

        DialogueMessage reply = storyService.processFreeInput(sessionId, text);
        if (reply != null && reply.fateDelta != 0) {
            try { fateService.applyChoice(userId, npcId, worldIndex, reply.fateDelta, reply.trustDelta); } catch (Exception ignored) {}
        }
        return ok(dialogueToMap(sessionId, reply));
    }

    @PostMapping("/story/end")
    public ResponseEntity<Map<String, Object>> endDialogue(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String sessionId = (String) body.get("sessionId");
        DialogueSession ds = storyService.endDialogue(sessionId);
        if (ds == null) return err("对话不存在");

        if (ds.getTotalFateDelta() != 0 || ds.getTotalTrustDelta() != 0) {
            try { fateService.applyChoice(userId, ds.getNpcId(), ds.getWorldIndex(), ds.getTotalFateDelta(), ds.getTotalTrustDelta()); } catch (Exception ignored) {}
        }
        return ok(Map.of(
                "sessionId", sessionId,
                "totalFateDelta", ds.getTotalFateDelta(),
                "totalTrustDelta", ds.getTotalTrustDelta(),
                "messageCount", ds.getMessages() != null ? ds.getMessages().size() : 0,
                "duration", ds.getEndTime() - ds.getStartTime()
        ));
    }

    // ── SSE 流式对话 ──────────────────────────────────

    @PostMapping(value = "/story/stream/start", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamStartDialogue(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        SseEmitter emitter = new SseEmitter(120_000L);

        String npcId = (String) body.get("npcId");
        int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();

        sseExecutor.execute(() -> {
            try {
                DialogueSession sess = storyService.startDialogue(userId, npcId, worldIndex);
                // 发送sessionId
                emitter.send(SseEmitter.event().name("session").data("{\"sessionId\":\"" + sess.getId() + "\"}"));

                // 恢复的历史对话：直接返回complete事件，携带历史数据
                if (storyService.isResumedSession(sess)) {
                    List<Map<String, Object>> history = storyService.getSessionHistory(sess.getId());
                    Map<String, Object> result = new HashMap<>();
                    result.put("sessionId", sess.getId());
                    result.put("resumed", true);
                    result.put("history", history);
                    if (!history.isEmpty()) {
                        Map<String, Object> lastNpc = null;
                        for (int i = history.size() - 1; i >= 0; i--) {
                            if ("npc".equals(history.get(i).get("role"))) { lastNpc = history.get(i); break; }
                        }
                        if (lastNpc != null) {
                            result.put("speaker", lastNpc.get("speaker"));
                            result.put("emotion", lastNpc.get("emotion"));
                            result.put("text", lastNpc.get("text"));
                            result.put("choicesJson", lastNpc.get("choicesJson"));
                            result.put("allowFreeInput", true);
                        }
                    }
                    result.putIfAbsent("speaker", npcId);
                    result.putIfAbsent("emotion", "calm");
                    result.putIfAbsent("text", "");
                    result.putIfAbsent("choicesJson", "[]");
                    result.putIfAbsent("allowFreeInput", true);
                    result.put("fateDelta", 0);
                    result.put("trustDelta", 0);
                    emitter.send(SseEmitter.event().name("complete").data(JSON.toJSONString(result)));
                    emitter.complete();
                    return;
                }

                // 新对话：流式生成开场白
                storyService.getOpeningLineStream(sess.getId(),
                        chunk -> { try { emitter.send(SseEmitter.event().name("chunk").data(chunk)); } catch (Exception ignored) {} },
                        msg -> {
                            try {
                                emitter.send(SseEmitter.event().name("complete").data(JSON.toJSONString(dialogueToMap(sess.getId(), msg))));
                                emitter.complete();
                            } catch (Exception ignored) { emitter.complete(); }
                        },
                        err -> {
                            log.warn("SSE stream error", err);
                            // fallback到非流式
                            try {
                                DialogueMessage opening = storyService.getOpeningLine(sess.getId());
                                emitter.send(SseEmitter.event().name("complete").data(JSON.toJSONString(dialogueToMap(sess.getId(), opening))));
                                emitter.complete();
                            } catch (Exception e) { completeWithError(emitter, e.getMessage()); }
                        }
                );
            } catch (Exception e) {
                completeWithError(emitter, e.getMessage());
            }
        });
        return emitter;
    }

    @PostMapping(value = "/story/stream/choice", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChoice(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        SseEmitter emitter = new SseEmitter(120_000L);

        String sessionId = (String) body.get("sessionId");
        int choiceId = ((Number) body.get("choiceId")).intValue();
        String npcId = (String) body.getOrDefault("npcId", "");
        int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();

        sseExecutor.execute(() -> {
            storyService.processChoiceStream(sessionId, choiceId,
                    chunk -> { try { emitter.send(SseEmitter.event().name("chunk").data(chunk)); } catch (Exception ignored) {} },
                    msg -> {
                        try {
                            if (msg.fateDelta != 0) {
                                try { fateService.applyChoice(userId, npcId, worldIndex, msg.fateDelta, msg.trustDelta); } catch (Exception ignored) {}
                            }
                            emitter.send(SseEmitter.event().name("complete").data(JSON.toJSONString(dialogueToMap(sessionId, msg))));
                            emitter.complete();
                        } catch (Exception ignored) { emitter.complete(); }
                    },
                    err -> {
                        log.warn("SSE choice stream error", err);
                        try {
                            DialogueMessage reply = storyService.processChoice(sessionId, choiceId);
                            if (reply != null && reply.fateDelta != 0) {
                                try { fateService.applyChoice(userId, npcId, worldIndex, reply.fateDelta, reply.trustDelta); } catch (Exception ignored) {}
                            }
                            emitter.send(SseEmitter.event().name("complete").data(JSON.toJSONString(dialogueToMap(sessionId, reply))));
                            emitter.complete();
                        } catch (Exception e) { completeWithError(emitter, e.getMessage()); }
                    }
            );
        });
        return emitter;
    }

    @PostMapping(value = "/story/stream/input", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamFreeInput(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        SseEmitter emitter = new SseEmitter(120_000L);

        String sessionId = (String) body.get("sessionId");
        String text = (String) body.get("text");
        String npcId = (String) body.getOrDefault("npcId", "");
        int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();

        sseExecutor.execute(() -> {
            storyService.processFreeInputStream(sessionId, text,
                    chunk -> { try { emitter.send(SseEmitter.event().name("chunk").data(chunk)); } catch (Exception ignored) {} },
                    msg -> {
                        try {
                            if (msg.fateDelta != 0) {
                                try { fateService.applyChoice(userId, npcId, worldIndex, msg.fateDelta, msg.trustDelta); } catch (Exception ignored) {}
                            }
                            emitter.send(SseEmitter.event().name("complete").data(JSON.toJSONString(dialogueToMap(sessionId, msg))));
                            emitter.complete();
                        } catch (Exception ignored) { emitter.complete(); }
                    },
                    err -> {
                        log.warn("SSE input stream error", err);
                        try {
                            DialogueMessage reply = storyService.processFreeInput(sessionId, text);
                            if (reply != null && reply.fateDelta != 0) {
                                try { fateService.applyChoice(userId, npcId, worldIndex, reply.fateDelta, reply.trustDelta); } catch (Exception ignored) {}
                            }
                            emitter.send(SseEmitter.event().name("complete").data(JSON.toJSONString(dialogueToMap(sessionId, reply))));
                            emitter.complete();
                        } catch (Exception e) { completeWithError(emitter, e.getMessage()); }
                    }
            );
        });
        return emitter;
    }

    private void completeWithError(SseEmitter emitter, String msg) {
        try {
            emitter.send(SseEmitter.event().name("error").data("{\"msg\":\"" + msg + "\"}"));
            emitter.complete();
        } catch (Exception ignored) {
            emitter.completeWithError(new RuntimeException(msg));
        }
    }

    @GetMapping("/story/npc/{npcId}")
    public ResponseEntity<Map<String, Object>> getNpcInfo(@PathVariable String npcId) {
        Optional<NpcTemplate> npcOpt = fateService.getNpcTemplate(npcId);
        Map<String, Object> info = new HashMap<>();
        npcOpt.ifPresentOrElse(npc -> {
            info.put("npcId", npcId);
            info.put("name", npc.getNpcName());
            info.put("bookTitle", npc.getBookTitle());
            info.put("personality", npc.getPersonality());
            info.put("emotion", npc.getEmotion());
            info.put("portraitBase", npc.getPortraitBase());
        }, () -> {
            info.put("npcId", npcId);
            info.put("name", npcId);
        });
        return ok(info);
    }

    // ── 场景图片生成 ──────────────────────────────────────

    /**
     * 生成场景图片（异步），返回图片ID。前端用 /api/story/scene-image/{id} 获取图片
     */
    @PostMapping("/story/scene-image")
    public ResponseEntity<Map<String, Object>> generateSceneImage(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String npcId = (String) body.get("npcId");
        int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();
        String artStyleOverride = (String) body.getOrDefault("artStyle", null);
        String sceneHint = (String) body.getOrDefault("sceneHint", null);

        Optional<NpcTemplate> npcOpt = fateService.getNpcTemplate(npcId);
        NpcTemplate npc = npcOpt.orElse(null);
        String npcName = npc != null ? npc.getNpcName() : "神秘角色";
        String bookTitle = npc != null ? npc.getBookTitle() : "仙侠世界";
        String personality = npc != null ? npc.getPersonality() : "飘逸神秘";
        String role = npc != null ? npc.getRole() : "";
        String gender = npc != null ? npc.getGender() : "";
        String features = npc != null ? npc.getFeatures() : "";

        String artStyle = resolveArtStyle(userId, worldIndex, bookTitle, artStyleOverride);

        String cacheKey = (sceneHint != null && !sceneHint.isBlank())
                ? npcId + "_" + worldIndex + "_" + sceneHint.hashCode() + "_" + artStyle.hashCode()
                : npcId + "_" + worldIndex + "_" + artStyle.hashCode();

        // 纯风景背景请求：不拼人物描述
        boolean landscapeOnly = npcId != null && npcId.startsWith("explore_bg");
        String prompt = landscapeOnly
                ? buildLandscapePrompt(bookTitle, artStyle, sceneHint)
                : buildScenePrompt(npcName, bookTitle, personality, role, artStyle, sceneHint, gender, features);

        Optional<SceneImage> result = sceneImageService.getOrGenerate(cacheKey, prompt);
        if (result.isEmpty()) return err("图片生成失败");

        String imageId = result.get().getId();
        String imageUrl = "/api/story/scene-image/" + imageId;

        // 无场景提示时为NPC立绘，同步更新Relation的imageUrl
        if (sceneHint == null || sceneHint.isBlank()) {
            List<Relation> rels = relationRepository.findByPlayerIdAndNpcIdAndWorldIndex(userId, npcId, worldIndex);
            if (!rels.isEmpty()) {
                Relation rel = rels.get(0);
                rel.setImageUrl(imageUrl);
                relationRepository.save(rel);
            }
        }

        return ok(Map.of("imageId", imageId, "imageUrl", imageUrl));
    }

    /** 决定图片风格优先级：请求参数 > 用户自定义 > 书籍默认 > 兜底 */
    private String resolveArtStyle(long userId, int worldIndex, String bookTitle, String artStyleOverride) {
        if (artStyleOverride != null && !artStyleOverride.isBlank()) return artStyleOverride;

        // 从用户选书记录获取自定义风格
        var selOpt = bookWorldService.getSelectedBook(userId, worldIndex);
        if (selOpt.isPresent()) {
            var sel = selOpt.get();
            if (sel.getCustomArtStyle() != null && !sel.getCustomArtStyle().isBlank()) {
                return sel.getCustomArtStyle();
            }
            // 从书籍获取默认风格
            var bookOpt = bookWorldService.getBookById(sel.getBookId());
            if (bookOpt.isPresent() && bookOpt.get().getArtStyle() != null) {
                return bookOpt.get().getArtStyle();
            }
        }

        return "唯美古风水墨画风格";
    }

    /**
     * 获取场景图片二进制流
     */
    @GetMapping("/story/scene-image/{id}")
    public ResponseEntity<byte[]> getSceneImage(@PathVariable String id) {
        Optional<SceneImage> opt = sceneImageService.getById(id);
        if (opt.isEmpty() || opt.get().getImageData() == null) {
            return ResponseEntity.notFound().build();
        }
        SceneImage si = opt.get();
        String ct = si.getContentType();
        MediaType mediaType = (ct != null && !ct.isBlank()) ? MediaType.parseMediaType(ct) : MediaType.IMAGE_PNG;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header("Cache-Control", "max-age=86400")
                .body(si.getImageData());
    }

    private String buildScenePrompt(String npcName, String bookTitle, String personality, String role,
                                     String artStyle, String sceneHint, String gender, String features) {
        StringBuilder sb = new StringBuilder();
        sb.append(artStyle).append("场景插画，").append(bookTitle).append("世界观，");
        sb.append("角色「").append(npcName).append("」");
        if (role != null && !role.isEmpty()) sb.append("（").append(role).append("）");
        if (gender != null && !gender.isEmpty()) sb.append("，").append(gender);
        if (features != null && !features.isEmpty()) sb.append("，外貌特征：").append(features);
        if (sceneHint != null && !sceneHint.isBlank()) {
            sb.append("，场景：").append(sceneHint);
        } else {
            sb.append("，登场画面");
        }
        sb.append("，人物气质").append(personality).append("，");
        sb.append("高清，16:9宽幅构图，展现角色全身或上半身，人物居中");
        return sb.toString();
    }

    private String buildLandscapePrompt(String bookTitle, String artStyle, String sceneHint) {
        StringBuilder sb = new StringBuilder();
        sb.append(artStyle).append("纯风景插画，").append(bookTitle).append("世界观，");
        sb.append("绝对没有人物、没有角色、没有人影，纯自然风景，");
        if (sceneHint != null && !sceneHint.isBlank()) {
            sb.append(sceneHint).append("，");
        }
        sb.append("高清，16:9宽幅构图，唯美清新，空灵意境");
        return sb.toString();
    }

    // ── 缘分系统 ──────────────────────────────────────

    @GetMapping("/fate/map")
    public ResponseEntity<Map<String, Object>> getFateMap(HttpSession session) {
        long userId = requireLogin(session);
        return ok(fateService.buildFateMapData(userId));
    }

    @GetMapping("/fate/relations")
    public ResponseEntity<Map<String, Object>> getRelations(HttpSession session) {
        long userId = requireLogin(session);
        List<Relation> relations = fateService.getRelations(userId);
        List<Map<String, Object>> list = relations.stream().map(this::relationToMap).toList();
        return ok(Map.of("relations", list));
    }

    @GetMapping("/fate/relation/{npcId}")
    public ResponseEntity<Map<String, Object>> getRelationDetail(@PathVariable String npcId,
                                                                   @RequestParam(defaultValue = "0") int worldIndex,
                                                                   HttpSession session) {
        long userId = requireLogin(session);
        Relation relation = fateService.getOrCreate(userId, npcId, worldIndex);
        Map<String, Object> data = relationToMap(relation);

        // 附带该NPC的记忆碎片
        List<MemoryFragment> memories = memoryService.listMemories(userId).stream()
                .filter(m -> npcId.equals(m.getNpcId()))
                .toList();
        data.put("memories", memories.stream().map(this::memoryToMap).toList());

        // 附带NPC模板信息
        fateService.getNpcTemplate(npcId).ifPresent(npc -> {
            data.put("personality", npc.getPersonality());
            data.put("role", npc.getRole());
            data.put("gender", npc.getGender());
            data.put("age", npc.getAge());
            data.put("features", npc.getFeatures());
            data.put("bookTitle", npc.getBookTitle());
        });

        return ok(data);
    }

    @PostMapping("/fate/decay")
    public ResponseEntity<Map<String, Object>> decayFateScores(HttpSession session) {
        long userId = requireLogin(session);
        fateService.applyDecayAll(userId);
        return ok(Map.of("msg", "衰减已应用"));
    }

    /** 查询NPC的缘分事件链（待触发的里程碑事件） */
    @GetMapping("/fate/milestones/{npcId}")
    public ResponseEntity<Map<String, Object>> getFateMilestones(@PathVariable String npcId,
                                                                   @RequestParam(defaultValue = "0") int worldIndex,
                                                                   HttpSession session) {
        long userId = requireLogin(session);
        Relation rel = fateService.getOrCreate(userId, npcId, worldIndex);

        List<Map<String, Object>> milestones = new ArrayList<>();
        for (int i = 0; i < Relation.MILESTONES.length; i++) {
            int threshold = Relation.MILESTONES[i];
            Map<String, Object> ms = new LinkedHashMap<>();
            ms.put("threshold", threshold);
            ms.put("title", Relation.MILESTONE_EVENTS[i][0]);
            ms.put("description", Relation.MILESTONE_EVENTS[i][1]);
            ms.put("reached", rel.getFateScore() >= threshold);
            ms.put("triggered", rel.getTriggeredMilestones() != null && rel.getTriggeredMilestones().contains(threshold));
            milestones.add(ms);
        }

        int nextMilestone = rel.getNextMilestone();
        return ok(Map.of(
            "npcId", npcId,
            "fateScore", rel.getFateScore(),
            "fateLevel", rel.getFateLevel(),
            "milestones", milestones,
            "nextMilestone", nextMilestone
        ));
    }

    /** 触发缘分里程碑事件（领取奖励） */
    @PostMapping("/fate/trigger-milestone")
    public ResponseEntity<Map<String, Object>> triggerFateMilestone(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String npcId = (String) body.get("npcId");
        int worldIndex = body.get("worldIndex") != null ? ((Number) body.get("worldIndex")).intValue() : 0;

        Relation rel = fateService.getOrCreate(userId, npcId, worldIndex);
        int nextMs = rel.getNextMilestone();
        if (nextMs <= 0) return err("暂无可触发的缘分事件");

        rel.markMilestoneTriggered(nextMs);
        relationRepository.save(rel);

        // 里程碑奖励
        int idx = java.util.Arrays.binarySearch(Relation.MILESTONES, nextMs);
        String eventTitle = idx >= 0 ? Relation.MILESTONE_EVENTS[idx][0] : "缘分事件";
        String eventDesc = idx >= 0 ? Relation.MILESTONE_EVENTS[idx][1] : "";

        int goldReward = nextMs * 10;
        int fateBonus = 5;
        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        currency.addGold(goldReward);
        shopService.saveCurrency(currency);
        rel.addFateScore(fateBonus);
        relationRepository.save(rel);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("milestone", nextMs);
        result.put("title", eventTitle);
        result.put("description", eventDesc);
        result.put("reward", Map.of("gold", goldReward, "fateBonus", fateBonus));
        result.put("newFateScore", rel.getFateScore());
        result.put("fateLevel", rel.getFateLevel());
        return ok(result);
    }

    private Map<String, Object> relationToMap(Relation r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("relationId", r.getId());
        m.put("npcId", r.getNpcId());
        m.put("npcName", r.getNpcName());
        m.put("fateScore", r.getFateScore());
        m.put("trustScore", r.getTrustScore());
        m.put("worldIndex", r.getWorldIndex());
        m.put("lastEmotion", r.getLastEmotion());
        m.put("imageUrl", r.getImageUrl());
        m.put("keyFacts", r.getKeyFacts());
        m.put("lastInteractTime", r.getUpdatedAt());
        m.put("milestone", r.isAtMilestone());
        m.put("fateLevel", r.getFateLevel());
        m.put("nextMilestone", r.getNextMilestone());
        m.put("triggeredMilestones", r.getTriggeredMilestones());
        return m;
    }

    // ── 七世轮回 ──────────────────────────────────────

    @GetMapping("/rebirth/status")
    public ResponseEntity<Map<String, Object>> getRebirthStatus(HttpSession session) {
        long userId = requireLogin(session);
        var pw = rebirthService.getCurrentWorld(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("currentWorldIndex", pw.getCurrentWorldIndex());
        result.put("totalRebirths", pw.getTotalRebirths());
        result.put("lastRebirthTime", pw.getLastRebirthTime());
        var cur = pw.getCurrentWorldRecord();
        if (cur != null) {
            result.put("currentBook", cur.getBookTitle());
            result.put("rebirthPoem", cur.getRebirthPoem());
        }
        return ok(result);
    }

    @PostMapping("/rebirth/select-book")
    public ResponseEntity<Map<String, Object>> selectBook(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String bookId = (String) body.get("bookId");
        String bookTitle = (String) body.get("bookTitle");
        var record = rebirthService.selectNextBook(userId, bookId, bookTitle);
        if (record == null) return err("已完成七世轮回");
        return ok(Map.of("worldIndex", record.getWorldIndex(), "bookId", bookId, "bookTitle", bookTitle));
    }

    // ── 角色 ──────────────────────────────────────

    @GetMapping("/person/me")
    public ResponseEntity<Map<String, Object>> getPersonInfo(HttpSession session) {
        long userId = requireLogin(session);
        Person person = personService.getPersonById(userId);
        if (person == null) return ok(Map.of("exists", false));
        Map<String, Object> m = new HashMap<>();
        m.put("exists", true);
        m.put("id", person.getId());
        m.put("name", person.getName());
        m.put("profession", person.getProfession());

        // 等级信息
        Level levelInfo = levelService.ofLevel(userId);
        PersonLevelConfig nextLevelConfig = levelService.getPersonLevelConfigByLevel(levelInfo.getLevel());
        m.put("level", Map.of(
                "level", levelInfo.getLevel(),
                "exp", levelInfo.getExp(),
                "maxExp", nextLevelConfig != null ? nextLevelConfig.getExp() : 0
        ));

        if (person.getBasicProperty() != null) {
            var bp = person.getBasicProperty();
            int bonus = levelInfo.getLevel() - 1;
            Map<String, Object> props = new LinkedHashMap<>();
            // 属性含等级加成：每级 HP+50, MP+20, 物攻+5, 物防+3, 法攻+4, 法防+3, 速度+1
            props.put("hp", bp.getHp() + bonus * 50);
            props.put("mp", bp.getMp() + bonus * 20);
            props.put("physicsAttack", bp.getPhysicsAttack() + bonus * 5);
            props.put("physicsDefense", bp.getPhysicsDefense() + bonus * 3);
            props.put("magicAttack", bp.getMagicAttack() + bonus * 4);
            props.put("magicDefense", bp.getMagicDefense() + bonus * 3);
            props.put("speed", bp.getSpeed() + bonus);
            props.put("bonusAttack", bp.getBonusAttack());
            props.put("bonusDefense", bp.getBonusDefense());
            props.put("agility", bp.getAgility());
            props.put("critRate", bp.getCritRate());
            m.put("basicProperty", props);
        }
        m.put("attributePoints", person.getAttributePoints());
        // 立绘URL
        if (person.getPortraitImageId() != null) {
            m.put("portraitUrl", "/api/story/scene-image/" + person.getPortraitImageId());
        }
        // 背景URL
        if (person.getBgImageId() != null) {
            m.put("bgUrl", "/api/story/scene-image/" + person.getBgImageId());
        }
        return ok(m);
    }

    /**
     * 生成角色立绘 + 背景框（并行调用火山引擎）
     */
    @PostMapping("/person/portrait")
    public ResponseEntity<Map<String, Object>> generatePortrait(@RequestBody Map<String, Object> body, HttpSession session) throws Exception {
        long userId = requireLogin(session);
        Person person = personService.getPersonById(userId);
        if (person == null) return err("角色不存在");

        boolean force = Boolean.TRUE.equals(body.get("force"));
        String style = (String) body.getOrDefault("style", "仙侠水墨风");

        String gender = person.getGender();
        String features = person.getFeatures();

        if (!force && person.getPortraitImageId() != null && person.getBgImageId() != null) {
            var ep = sceneImageService.getById(person.getPortraitImageId());
            var eb = sceneImageService.getById(person.getBgImageId());
            if (ep.isPresent() && eb.isPresent()) {
                return ok(Map.of(
                    "portraitUrl", "/api/story/scene-image/" + person.getPortraitImageId(),
                    "bgUrl", "/api/story/scene-image/" + person.getBgImageId()
                ));
            }
        }

        long ts = force ? System.currentTimeMillis() : 0;

        String portraitPrompt = buildPortraitPrompt(person.getName(), style, gender, features);
        String portraitKey = "portrait_" + userId + "_" + style.hashCode() + (ts > 0 ? "_" + ts : "");
        String bgPrompt = buildBgPrompt(style);
        String bgKey = "bg_" + userId + "_" + style.hashCode() + (ts > 0 ? "_" + ts : "");

        var portraitFuture = java.util.concurrent.CompletableFuture.supplyAsync(
            () -> sceneImageService.getOrGenerate(portraitKey, portraitPrompt), sseExecutor);
        var bgFuture = java.util.concurrent.CompletableFuture.supplyAsync(
            () -> sceneImageService.getOrGenerate(bgKey, bgPrompt), sseExecutor);

        Optional<SceneImage> portraitResult = portraitFuture.get(120, java.util.concurrent.TimeUnit.SECONDS);
        Optional<SceneImage> bgResult = bgFuture.get(120, java.util.concurrent.TimeUnit.SECONDS);

        if (portraitResult.isEmpty()) return err("立绘生成失败");

        person.setPortraitImageId(portraitResult.get().getId());
        if (bgResult.isPresent()) {
            person.setBgImageId(bgResult.get().getId());
        }
        personService.savePerson(person);

        Map<String, Object> result = new HashMap<>();
        result.put("portraitUrl", "/api/story/scene-image/" + portraitResult.get().getId());
        if (bgResult.isPresent()) {
            result.put("bgUrl", "/api/story/scene-image/" + bgResult.get().getId());
        }
        return ok(result);
    }

    // ── 统一立绘生成（角色/灵侣/宠物） ──────────────────

    @PostMapping("/portrait/generate")
    public ResponseEntity<Map<String, Object>> generateSubjectPortrait(@RequestBody Map<String, Object> body, HttpSession session) throws Exception {
        long userId = requireLogin(session);
        String target = (String) body.getOrDefault("target", "person");
        String targetId = (String) body.get("targetId");
        String style = (String) body.getOrDefault("style", "仙侠水墨风");
        long ts = System.currentTimeMillis();

        switch (target) {
            case "companion" -> {
                CompanionBag bag = companionService.ofCompanionBag(userId);
                SpiritCompanion comp = findCompanionById(bag, targetId);
                if (comp == null) return err("灵侣不存在");
                String cacheKey = "portrait_comp_" + comp.getId() + "_" + style.hashCode() + "_" + ts;
                var result = runImageTask(() -> sceneImageService.getOrGenerate(cacheKey, buildCompanionPortraitPrompt(comp, style)));
                if (result.isEmpty()) return err("灵侣立绘生成失败");
                comp.setPortraitImageId(result.get().getId());
                companionService.save(bag);
                return ok(Map.of("portraitUrl", "/api/story/scene-image/" + result.get().getId()));
            }
            case "pet" -> {
                PetBag petBag = petService.ofPetBag(userId);
                Pet pet = petBag.getPet(targetId);
                if (pet == null) return err("宠物不存在");
                String cacheKey = "portrait_pet_" + pet.getId() + "_" + style.hashCode() + "_" + ts;
                var result = runImageTask(() -> sceneImageService.getOrGenerate(cacheKey, buildPetPortraitPrompt(pet, style)));
                if (result.isEmpty()) return err("宠物立绘生成失败");
                pet.setPortraitImageId(result.get().getId());
                petService.save(petBag);
                return ok(Map.of("portraitUrl", "/api/story/scene-image/" + result.get().getId()));
            }
            default -> {
                Person person = personService.getPersonById(userId);
                if (person == null) return err("角色不存在");
                String cacheKey = "portrait_" + userId + "_" + style.hashCode() + "_" + ts;
                var result = runImageTask(() -> sceneImageService.getOrGenerate(cacheKey, buildPortraitPrompt(person.getName(), style, person.getGender(), person.getFeatures())));
                if (result.isEmpty()) return err("立绘生成失败");
                person.setPortraitImageId(result.get().getId());
                personService.savePerson(person);
                return ok(Map.of("portraitUrl", "/api/story/scene-image/" + result.get().getId()));
            }
        }
    }

    @PostMapping("/portrait/edit")
    public ResponseEntity<Map<String, Object>> editSubjectPortrait(@RequestBody Map<String, Object> body, HttpSession session) throws Exception {
        long userId = requireLogin(session);
        String target = (String) body.getOrDefault("target", "person");
        String targetId = (String) body.get("targetId");

        switch (target) {
            case "companion" -> {
                CompanionBag bag = companionService.ofCompanionBag(userId);
                SpiritCompanion comp = findCompanionById(bag, targetId);
                if (comp == null) return err("灵侣不存在");
                if (comp.getPortraitImageId() == null) return err("请先生成灵侣立绘");
                var result = runImageTask(() -> sceneImageService.editImage(comp.getPortraitImageId(), buildEditPrompt(body, "灵侣")));
                if (result.isEmpty()) return err("灵侣立绘调整失败");
                comp.setPortraitImageId(result.get().getId());
                companionService.save(bag);
                return ok(Map.of("portraitUrl", "/api/story/scene-image/" + result.get().getId()));
            }
            case "pet" -> {
                PetBag petBag = petService.ofPetBag(userId);
                Pet pet = petBag.getPet(targetId);
                if (pet == null) return err("宠物不存在");
                if (pet.getPortraitImageId() == null) return err("请先生成宠物立绘");
                var result = runImageTask(() -> sceneImageService.editImage(pet.getPortraitImageId(), buildEditPrompt(body, "宠物")));
                if (result.isEmpty()) return err("宠物立绘调整失败");
                pet.setPortraitImageId(result.get().getId());
                petService.save(petBag);
                return ok(Map.of("portraitUrl", "/api/story/scene-image/" + result.get().getId()));
            }
            default -> {
                Person person = personService.getPersonById(userId);
                if (person == null) return err("角色不存在");
                if (person.getPortraitImageId() == null) return err("请先生成立绘");
                var result = runImageTask(() -> sceneImageService.editImage(person.getPortraitImageId(), buildEditPrompt(body, "角色")));
                if (result.isEmpty()) return err("立绘调整失败");
                person.setPortraitImageId(result.get().getId());
                personService.savePerson(person);
                return ok(Map.of("portraitUrl", "/api/story/scene-image/" + result.get().getId()));
            }
        }
    }

    private Optional<SceneImage> runImageTask(
            java.util.concurrent.Callable<Optional<SceneImage>> task) throws Exception {
        return java.util.concurrent.CompletableFuture
                .supplyAsync(() -> { try { return task.call(); } catch (Exception e) { throw new RuntimeException(e); } }, sseExecutor)
                .get(120, java.util.concurrent.TimeUnit.SECONDS);
    }

    private String buildCompanionPortraitPrompt(SpiritCompanion comp, String style) {
        return style + "灵侣立绘，" + comp.getName() + "，"
                + comp.getType() + "属性，" + comp.getRealm() + "境界，"
                + "仙侠角色，气质出众，"
                + "单人半身立绘（从头到腰部），正面或四分之三侧面，"
                + "人物完整清晰，占画面80%以上，面部精致，表情生动，"
                + "姿态飘逸，主体居中，"
                + "【颜色要求】头发和服饰禁止使用纯黑色，服饰使用明亮鲜艳色系，"
                + "【背景】纯黑色(#000000)，无纹理无光晕，"
                + "主体与背景边界清晰，无颜色溢出，高清8K";
    }

    private String buildPetPortraitPrompt(Pet pet, String style) {
        String typeLabel = pet.getPetType() != null ? pet.getPetType() : "神兽";
        String elementLabel = pet.getElement() != null ? pet.getElement() + "属性" : "";
        return style + "宠物立绘，" + (pet.getNickname() != null ? pet.getNickname() + "，" : "")
                + typeLabel + "，" + elementLabel + "，"
                + "神话幻想生物，威严灵动，"
                + "完整全身像，主体居中占画面80%以上，"
                + "主体配色鲜艳，禁止纯黑色皮毛/身体，"
                + "【背景】纯黑色(#000000)，无纹理无光晕，"
                + "主体与背景边界清晰，无颜色溢出，高清8K";
    }

    private String buildEditPrompt(Map<String, Object> body, String subjectType) {
        StringBuilder sb = new StringBuilder();
        sb.append("基于原图进行局部调整，保持").append(subjectType).append("整体形象和画风一致，");

        appendDim(sb, body, "hairstyle", "发型");
        appendDim(sb, body, "expression", "表情");
        appendDim(sb, body, "clothing", "服饰");
        appendDim(sb, body, "accessory", "配饰");
        appendDim(sb, body, "pose", "姿态");
        appendDim(sb, body, "hairColor", "发色");
        appendDim(sb, body, "bodyColor", "体色");

        String custom = (String) body.get("custom");
        if (custom != null && !custom.isEmpty()) sb.append(custom).append("，");

        sb.append("主体完整清晰，占画面80%以上，主体居中，");
        sb.append("【颜色要求】头发和服饰禁止使用纯黑色，服饰使用明亮鲜艳色系，");
        sb.append("【背景】纯黑色(#000000)，无纹理无光晕，主体与背景边界清晰，高清8K");
        return sb.toString();
    }

    private SpiritCompanion findCompanionById(CompanionBag bag, String id) {
        if (bag.getCompanions() == null || id == null) return null;
        return bag.getCompanions().stream().filter(c -> c.getId().equals(id)).findFirst().orElse(null);
    }

    private void appendDim(StringBuilder sb, Map<String, Object> body, String key, String label) {
        String val = (String) body.get(key);
        if (val != null && !val.isEmpty()) sb.append(label).append("改为").append(val).append("，");
    }

    @PostMapping("/person/background")
    public ResponseEntity<Map<String, Object>> generateBackground(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        Person person = personService.getPersonById(userId);
        if (person == null) return err("角色不存在");

        String theme = (String) body.getOrDefault("theme", "樱花林");
        long ts = System.currentTimeMillis();

        String bgPrompt = buildBgPrompt(theme);
        String bgKey = "bg_" + userId + "_" + theme.hashCode() + "_" + ts;

        Optional<SceneImage> bgResult = sceneImageService.getOrGenerate(bgKey, bgPrompt);
        if (bgResult.isEmpty()) return err("背景生成失败");

        person.setBgImageId(bgResult.get().getId());
        personService.savePerson(person);

        return ok(Map.of("bgUrl", "/api/story/scene-image/" + bgResult.get().getId()));
    }

    private String buildPortraitPrompt(String name, String style, String gender, String features) {
        StringBuilder sb = new StringBuilder();
        sb.append(style).append("角色立绘，");
        // 性别
        if ("female".equals(gender)) {
            sb.append("女性角色，气质优雅");
        } else if ("male".equals(gender)) {
            sb.append("男性角色，气质英武");
        } else {
            sb.append("仙侠角色");
        }
        // 外貌特征（发型、服饰等用户创建时填写的信息）
        if (features != null && !features.isEmpty()) sb.append("，").append(features);
        sb.append("，单人半身立绘（从头到腰部），正面或四分之三侧面，");
        sb.append("人物占画面80%以上，面部清晰精致，表情生动，");
        sb.append("人物完整清晰，姿态飘逸，主体居中，");
        sb.append("【颜色要求】头发和服饰禁止使用纯黑色，服饰使用明亮鲜艳色系，");
        sb.append("【背景】纯黑色(#000000)，无纹理无光晕，");
        sb.append("主体与背景边界清晰，无颜色溢出，高清8K");
        return sb.toString();
    }

    private String buildBgPrompt(String theme) {
        StringBuilder sb = new StringBuilder();
        sb.append("仙侠风格场景背景图，");
        sb.append("主题：").append(theme).append("，");
        sb.append("色彩丰富，意境深远，光影层次分明，");
        sb.append("画面唯美大气，具有史诗感，");
        sb.append("【严格要求】画面中绝对不能出现任何人物、角色、生物、剪影、身影，");
        sb.append("只有纯粹的场景环境，高清");
        return sb.toString();
    }

    @PostMapping("/person/init")
    public ResponseEntity<Map<String, Object>> initPerson(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String name = (String) body.getOrDefault("name", "");
        String gender = (String) body.getOrDefault("gender", "");
        String features = (String) body.getOrDefault("features", "");
        String profession = (String) body.getOrDefault("profession", "ATTACK");

        Person existing = personService.getPersonById(userId);
        if (existing == null) {
            personService.createPerson(userId, profession);
        }
        Person person = personService.getPersonById(userId);
        if (name != null && !name.isBlank()) person.setName(name);
        if (gender != null && !gender.isBlank()) person.setGender(gender);
        if (features != null && !features.isBlank()) person.setFeatures(features);
        if (person.getProfession() == null) person.setProfession(profession);
        personService.savePerson(person);
        return ok(Map.of("id", person.getId(), "name", person.getName(), "profession", person.getProfession()));
    }

    // ── 背包 ──────────────────────────────────────

    @GetMapping("/bag/list")
    public ResponseEntity<Map<String, Object>> getBagList(HttpSession session) {
        long userId = requireLogin(session);
        Bag bag = bagService.ofBag(userId);
        List<Map<String, Object>> items = new ArrayList<>();

        // 普通背包物品
        if (bag.getItemMap() != null) {
            bag.getItemMap().forEach((id, item) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", item.getId());
                m.put("itemTypeId", item.getItemTypeId());
                m.put("quantity", item.getQuantity());
                ShopItem shopItem = shopService.getItem(item.getItemTypeId());
                if (shopItem != null) {
                    m.put("name", shopItem.getName());
                    m.put("icon", shopItem.getIcon());
                    m.put("description", shopItem.getDescription());
                    m.put("category", shopItem.getCategory());
                    m.put("quality", shopItem.getQuality());
                    if (shopItem.getEffect() != null) {
                        m.put("effectType", shopItem.getEffect().getType());
                    }
                } else {
                    m.put("name", item.getItemTypeId());
                    m.put("icon", "📦");
                }
                items.add(m);
            });
        }

        // 装备也展示在背包中（category=equipment）
        List<Equip> equips = equipService.listByUser(userId);
        for (Equip equip : equips) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", equip.getId());
            m.put("itemTypeId", equip.getItemTypeId());
            m.put("quantity", 1);
            m.put("category", "equipment");
            m.put("equipId", equip.getId());
            m.put("equipPosition", equip.getPosition());
            ShopItem src = shopService.getItem(equip.getItemTypeId());
            if (src != null) {
                m.put("name", src.getName());
                m.put("icon", src.getIcon());
                m.put("description", src.getDescription());
                m.put("quality", src.getQuality());
            } else {
                m.put("name", equipPositionName(equip.getPosition()));
                m.put("icon", "⚔️");
                m.put("quality", "common");
            }
            items.add(m);
        }

        Map<String, Object> capacity = new LinkedHashMap<>();
        capacity.put("used", items.size());
        capacity.put("max", BAG_DEFAULT_CAPACITY);
        return ok(Map.of("items", items, "capacity", capacity));
    }

    /** 背包默认容量上限（扩容卡功能落地后改为 Bag 实体字段） */
    private static final int BAG_DEFAULT_CAPACITY = 40;

    @PostMapping("/bag/use")
    public ResponseEntity<Map<String, Object>> useBagItem(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String itemId = (String) body.get("id");
        String itemTypeId = (String) body.get("itemTypeId");
        int quantity = ((Number) body.getOrDefault("quantity", 1)).intValue();

        BagItem decrement = new BagItem();
        decrement.setId(itemId);
        decrement.setItemTypeId(itemTypeId);
        decrement.setQuantity(quantity);
        bagService.decrementItem(decrement, userId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("msg", "使用成功");

        ShopItem shopItem = shopService.getItem(itemTypeId);
        if (shopItem != null && shopItem.getEffect() != null) {
            ShopItem.Effect effect = shopItem.getEffect();
            int totalValue = effect.getValue() * quantity;
            switch (effect.getType()) {
                case "exp" -> {
                    LevelService.LevelUpResult lr = levelService.addExpWithAutoLevelUp(userId, totalValue);
                    grantAttributePoints(userId, lr.levelsGained());
                    Level newLevel = lr.level();
                    PersonLevelConfig nextConfig = levelService.getPersonLevelConfigByLevel(newLevel.getLevel());
                    result.put("expGained", totalValue);
                    result.put("levelsGained", lr.levelsGained());
                    result.put("currentLevel", newLevel.getLevel());
                    result.put("currentExp", newLevel.getExp());
                    result.put("maxExp", nextConfig != null ? nextConfig.getExp() : 0);
                }
                case "reset_attr" -> result.put("resetAttr", true);
            }
        }

        return ok(result);
    }

    @PostMapping("/person/allot-points")
    public ResponseEntity<Map<String, Object>> allotPersonPoints(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        Person person = personService.getPersonById(userId);
        if (person == null) return err("角色不存在");
        if (person.getBasicProperty() == null) return err("角色属性未初始化");

        int totalNeeded = 0;
        Map<String, Integer> alloc = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : body.entrySet()) {
            if (entry.getValue() instanceof Number n && n.intValue() > 0) {
                alloc.put(entry.getKey(), n.intValue());
                totalNeeded += n.intValue();
            }
        }
        if (totalNeeded == 0) return err("未分配任何属性点");
        if (person.getAttributePoints() < totalNeeded) return err("属性点不足");

        var bp = person.getBasicProperty();
        if (person.getAllocatedPoints() == null) person.setAllocatedPoints(new HashMap<>());
        for (Map.Entry<String, Integer> e : alloc.entrySet()) {
            int pts = e.getValue();
            switch (e.getKey()) {
                case "hp"             -> bp.setHp(bp.getHp() + pts * 20);
                case "mp"             -> bp.setMp(bp.getMp() + pts * 10);
                case "physicsAttack"  -> bp.setPhysicsAttack(bp.getPhysicsAttack() + pts * 3);
                case "physicsDefense" -> bp.setPhysicsDefense(bp.getPhysicsDefense() + pts * 2);
                case "magicAttack"    -> bp.setMagicAttack(bp.getMagicAttack() + pts * 3);
                case "speed"          -> bp.setSpeed(bp.getSpeed() + pts);
                case "agility"        -> { bp.setAgility(bp.getAgility() + pts); bp.recalcBonus(); }
            }
            person.getAllocatedPoints().merge(e.getKey(), pts, Integer::sum);
        }
        person.setAttributePoints(person.getAttributePoints() - totalNeeded);
        personService.savePerson(person);
        return ok(Map.of("attributePoints", person.getAttributePoints(), "msg", "分配成功"));
    }

    @PostMapping("/person/reset-points")
    public ResponseEntity<Map<String, Object>> resetPersonPoints(HttpSession session) {
        long userId = requireLogin(session);
        Person person = personService.getPersonById(userId);
        if (person == null) return err("角色不存在");
        if (person.getBasicProperty() == null) return err("角色属性未初始化");
        if (person.getAllocatedPoints() == null || person.getAllocatedPoints().isEmpty()) {
            return err("暂无已分配的属性点");
        }

        var bp = person.getBasicProperty();
        int totalRefund = 0;
        for (Map.Entry<String, Integer> e : person.getAllocatedPoints().entrySet()) {
            int pts = e.getValue();
            if (pts <= 0) continue;
            totalRefund += pts;
            switch (e.getKey()) {
                case "hp"             -> bp.setHp(bp.getHp() - pts * 20);
                case "mp"             -> bp.setMp(bp.getMp() - pts * 10);
                case "physicsAttack"  -> bp.setPhysicsAttack(bp.getPhysicsAttack() - pts * 3);
                case "physicsDefense" -> bp.setPhysicsDefense(bp.getPhysicsDefense() - pts * 2);
                case "magicAttack"    -> bp.setMagicAttack(bp.getMagicAttack() - pts * 3);
                case "speed"          -> bp.setSpeed(bp.getSpeed() - pts);
                case "agility"        -> { bp.setAgility(bp.getAgility() - pts); bp.recalcBonus(); }
            }
        }
        person.getAllocatedPoints().clear();
        person.setAttributePoints(person.getAttributePoints() + totalRefund);
        personService.savePerson(person);
        return ok(Map.of("attributePoints", person.getAttributePoints(), "refunded", totalRefund, "msg", "属性点已重置"));
    }

    // ── 任务 ──────────────────────────────────────

    @GetMapping("/quest/list")
    public ResponseEntity<Map<String, Object>> listQuests(HttpSession session) {
        long userId = requireLogin(session);
        List<Quest> quests = questService.listQuest(userId);
        return ok(Map.of("quests", quests.stream().map(this::questToMap).toList()));
    }

    @GetMapping("/quest/available")
    public ResponseEntity<Map<String, Object>> listAvailableQuests(HttpSession session,
                                                                    @RequestParam(defaultValue = "1") int level) {
        long userId = requireLogin(session);
        var templates = questService.listAvailableQuest(userId, level);
        List<Map<String, Object>> list = templates.stream().map(t -> {
            Map<String, Object> m = new HashMap<>();
            m.put("questId", t.getQuestId());
            m.put("questName", t.getQuestName());
            m.put("description", t.getDescription());
            m.put("questType", t.getQuestType() != null ? t.getQuestType().name() : "MAIN");
            m.put("targetProgress", t.getTargetProgress());
            m.put("requiredLevel", t.getRequiredLevel());
            m.put("npcId", t.getNpcId());
            return m;
        }).toList();
        return ok(Map.of("quests", list));
    }

    @PostMapping("/quest/accept")
    public ResponseEntity<Map<String, Object>> acceptQuest(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String questId = (String) body.get("questId");
        Quest quest = questService.acceptQuest(userId, questId);
        if (quest == null) return err("任务不存在或无法接取");
        return ok(questToMap(quest));
    }

    @PostMapping("/quest/abandon")
    public ResponseEntity<Map<String, Object>> abandonQuest(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String questId = (String) body.get("questId");
        Quest quest = questService.abandonQuest(userId, questId);
        if (quest == null) return err("任务不存在");
        return ok(Map.of("msg", "已放弃"));
    }

    private Map<String, Object> questToMap(Quest q) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", q.getId());
        m.put("questId", q.getQuestId());
        m.put("questName", q.getQuestName());
        m.put("description", q.getDescription());
        m.put("questType", q.getQuestType() != null ? q.getQuestType().name() : "MAIN");
        m.put("status", q.getStatus() != null ? q.getStatus().name() : "AVAILABLE");
        m.put("currentProgress", q.getCurrentProgress());
        m.put("targetProgress", q.getTargetProgress());
        m.put("npcId", q.getNpcId());
        return m;
    }

    // ── 装备系统 ──────────────────────────────────────

    @GetMapping("/equip/list")
    public ResponseEntity<Map<String, Object>> getEquipList(HttpSession session) {
        long userId = requireLogin(session);
        List<Equip> equips = equipService.listByUser(userId);
        List<Map<String, Object>> list = equips.stream().map(this::equipToMap).toList();
        return ok(Map.of("equips", list));
    }

    @GetMapping("/equip/{equipId}")
    public ResponseEntity<Map<String, Object>> getEquip(@PathVariable String equipId) {
        Equip equip = equipService.findById(equipId);
        if (equip == null) return err("装备不存在");
        return ok(equipToMap(equip));
    }

    @PostMapping("/equip/allot")
    public ResponseEntity<Map<String, Object>> allotEquip(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String equipId = (String) body.get("equipId");
        Equip equip = equipService.findById(equipId);
        if (equip == null) return err("装备不存在");

        ElseEquipProperty elseProps = equip.getElseEquipProperty();
        if (elseProps == null) elseProps = new ElseEquipProperty();

        elseProps.setConstitution(elseProps.getConstitution() + ((Number) body.getOrDefault("constitution", 0)).intValue());
        elseProps.setMagicPower(elseProps.getMagicPower() + ((Number) body.getOrDefault("magicPower", 0)).intValue());
        elseProps.setPower(elseProps.getPower() + ((Number) body.getOrDefault("power", 0)).intValue());
        elseProps.setEndurance(elseProps.getEndurance() + ((Number) body.getOrDefault("endurance", 0)).intValue());
        elseProps.setAgile(elseProps.getAgile() + ((Number) body.getOrDefault("agile", 0)).intValue());

        equip.setElseEquipProperty(elseProps);
        equipService.allotEquip(equip);
        Equip updated = equipService.findById(equipId);
        return ok(equipToMap(updated));
    }

    @PostMapping("/equip/identify")
    public ResponseEntity<Map<String, Object>> identifyEquip(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String equipId = (String) body.get("equipId");
        Equip equip = equipService.resetEquip(equipId, BigDecimal.ZERO);
        return ok(equipToMap(equip));
    }

    @PostMapping("/equip/delete")
    public ResponseEntity<Map<String, Object>> deleteEquips(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        equipService.delBatch(ids);
        return ok(Map.of("msg", "删除成功"));
    }

    /** 随机获取一件装备（用于抽奖/掉落） */
    @PostMapping("/equip/random")
    public ResponseEntity<Map<String, Object>> randomDropEquip(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String maxQuality = (String) body.getOrDefault("maxQuality", "epic");
        Equip equip = dropRandomEquip(userId, maxQuality);
        if (equip == null) return err("无可用装备池");
        return ok(equipToMap(equip));
    }

    private Map<String, Object> equipToMap(Equip equip) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", equip.getId());
        m.put("itemTypeId", equip.getItemTypeId());
        m.put("position", equip.getPosition());
        m.put("level", equip.getLevel());
        m.put("quality", equip.getQuality());
        m.put("attrTotal", equip.getAttrTotal());
        m.put("undistributedAttr", equip.getUndistributedAttr());
        m.put("identifyCount", equip.getIdentifyCount());
        m.put("grade", equip.getGrade());
        m.put("furnaceGrade", equip.getFurnaceGrade());

        // 装备名称：从商城数据获取
        ShopItem src = shopService.getItem(equip.getItemTypeId());
        m.put("name", src != null ? src.getName() : equipPositionName(equip.getPosition()));
        m.put("icon", src != null ? src.getIcon() : "⚔️");

        if (equip.getFixedEquipProperty() != null) {
            var fp = equip.getFixedEquipProperty();
            m.put("fixedProps", Map.of(
                    "hp", fp.getHp(), "mp", fp.getMp(),
                    "physicsAttack", fp.getPhysicsAttack(), "physicsDefense", fp.getPhysicsDefense(),
                    "magicAttack", fp.getMagicAttack(), "magicDefense", fp.getMagicDefense(),
                    "speed", fp.getSpeed()
            ));
        }
        if (equip.getElseEquipProperty() != null) {
            var ep = equip.getElseEquipProperty();
            m.put("elseProps", Map.of(
                    "constitution", ep.getConstitution(), "magicPower", ep.getMagicPower(),
                    "power", ep.getPower(), "endurance", ep.getEndurance(), "agile", ep.getAgile()
            ));
        }
        return m;
    }

    private String equipPositionName(int position) {
        return switch (position) {
            case 1 -> "武器";
            case 2 -> "护甲";
            case 3 -> "饰品";
            default -> "装备";
        };
    }

    // ── NPC 管理 ──────────────────────────────────────

    @GetMapping("/npc/list")
    public ResponseEntity<Map<String, Object>> listNpcs(
            @RequestParam(defaultValue = "0") int worldIndex,
            @RequestParam(required = false) String bookTitle) {
        List<NpcTemplate> templates = (bookTitle != null && !bookTitle.isBlank())
                ? npcTemplateRepository.findByBookTitle(bookTitle)
                : npcTemplateRepository.findAll();
        List<Map<String, Object>> list = templates.stream().map(npc -> {
            Map<String, Object> m = new HashMap<>();
            m.put("npcId", npc.getNpcId());
            m.put("npcName", npc.getNpcName());
            m.put("bookTitle", npc.getBookTitle());
            m.put("personality", npc.getPersonality());
            m.put("role", npc.getRole());
            m.put("emotion", npc.getEmotion());
            m.put("portraitBase", npc.getPortraitBase());
            m.put("gender", npc.getGender());
            m.put("age", npc.getAge());
            m.put("features", npc.getFeatures());
            // 查找已缓存的立绘（不触发生成）
            String prefix = npc.getNpcId() + "_" + worldIndex + "_";
            sceneImageService.findCachedByPrefix(prefix)
                    .ifPresent(si -> m.put("portraitUrl", "/api/story/scene-image/" + si.getId()));
            return m;
        }).toList();
        return ok(Map.of("npcs", list));
    }

    // ── 书籍世界 ──────────────────────────────────────

    @GetMapping("/bookworld/list")
    public ResponseEntity<Map<String, Object>> listBooks() {
        List<BookWorld> books = bookWorldService.listAllBooks();
        List<Map<String, Object>> list = books.stream().map(b -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", b.getId());
            m.put("title", b.getTitle());
            m.put("author", b.getAuthor());
            m.put("category", b.getCategory() != null ? b.getCategory().name() : "");
            m.put("loreSummary", b.getLoreSummary());
            m.put("artStyle", b.getArtStyle());
            m.put("colorPalette", b.getColorPalette());
            m.put("languageStyle", b.getLanguageStyle());
            m.put("coverUrl", b.getCoverUrl());
            return m;
        }).toList();
        return ok(Map.of("books", list));
    }

    @PostMapping("/bookworld/select")
    public ResponseEntity<Map<String, Object>> selectBookWorld(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        int worldIndex = ((Number) body.get("worldIndex")).intValue();
        String bookId = (String) body.get("bookId");
        String customArtStyle = (String) body.getOrDefault("customArtStyle", null);
        bookWorldService.selectBook(userId, worldIndex, bookId, customArtStyle);
        return ok(Map.of("msg", "选择成功"));
    }

    /** 查询当前已选书籍及其信息 */
    @GetMapping("/bookworld/selected")
    public ResponseEntity<Map<String, Object>> getSelectedBook(HttpSession session,
                                                                @RequestParam(defaultValue = "1") int worldIndex) {
        long userId = requireLogin(session);
        return bookWorldService.getSelectedBook(userId, worldIndex)
                .flatMap(sel -> bookWorldService.getBookById(sel.getBookId()).map(book -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("bookId", book.getId());
                    m.put("title", book.getTitle());
                    m.put("author", book.getAuthor());
                    m.put("category", book.getCategory() != null ? book.getCategory().name() : "");
                    m.put("loreSummary", book.getLoreSummary());
                    m.put("artStyle", book.getArtStyle());
                    m.put("colorPalette", book.getColorPalette());
                    m.put("languageStyle", book.getLanguageStyle());
                    m.put("customArtStyle", sel.getCustomArtStyle());
                    return ok(m);
                }))
                .orElseGet(() -> ok(Map.of("bookId", "")));
    }

    /** 更新自定义图片风格 */
    @PostMapping("/bookworld/art-style")
    public ResponseEntity<Map<String, Object>> updateArtStyle(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();
        String customArtStyle = (String) body.get("customArtStyle");
        bookWorldService.updateCustomArtStyle(userId, worldIndex, customArtStyle);
        return ok(Map.of("msg", "风格更新成功"));
    }

    @PostMapping("/bookworld/upload-content")
    public ResponseEntity<Map<String, Object>> uploadBookContent(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String bookId = (String) body.get("bookId");
        String content = (String) body.get("content");
        if (bookId == null || content == null || content.isBlank()) return err("参数缺失");
        int chunks = bookRagService.processBookContent(bookId, content);
        return ok(Map.of("msg", "处理完成", "chunks", chunks));
    }

    @PostMapping("/bookworld/add-from-web")
    public ResponseEntity<Map<String, Object>> addBookFromWeb(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String title = (String) body.get("title");
        if (title == null || title.isBlank()) return err("请输入书名");
        Map<String, Object> result = bookCrawlService.addBookFromWeb(userId, title.trim());

        BookWorld book = (BookWorld) result.get("book");
        @SuppressWarnings("unchecked")
        List<NpcTemplate> npcs = (List<NpcTemplate>) result.get("npcs");

        Map<String, Object> bookMap = new HashMap<>();
        bookMap.put("id", book.getId());
        bookMap.put("title", book.getTitle());
        bookMap.put("author", book.getAuthor());
        bookMap.put("category", book.getCategory() != null ? book.getCategory().name() : "");
        bookMap.put("loreSummary", book.getLoreSummary());
        bookMap.put("artStyle", book.getArtStyle());
        bookMap.put("colorPalette", book.getColorPalette());
        bookMap.put("languageStyle", book.getLanguageStyle());
        bookMap.put("coverUrl", book.getCoverUrl());

        List<Map<String, Object>> npcList = npcs.stream().map(npc -> {
            Map<String, Object> m = new HashMap<>();
            m.put("npcId", npc.getNpcId());
            m.put("npcName", npc.getNpcName());
            m.put("bookTitle", npc.getBookTitle());
            m.put("personality", npc.getPersonality());
            m.put("role", npc.getRole());
            m.put("emotion", npc.getEmotion());
            m.put("gender", npc.getGender());
            m.put("age", npc.getAge());
            m.put("features", npc.getFeatures());
            return m;
        }).toList();

        return ok(Map.of("book", bookMap, "npcs", npcList, "msg", result.get("msg")));
    }

    // ── 记忆碎片 ──────────────────────────────────────

    @GetMapping("/memory/list")
    public ResponseEntity<Map<String, Object>> listMemories(HttpSession session,
                                                             @RequestParam(required = false) Integer worldIndex) {
        long userId = requireLogin(session);
        List<MemoryFragment> memories;
        if (worldIndex != null) {
            memories = memoryService.listByWorld(userId, worldIndex);
        } else {
            memories = memoryService.listMemories(userId);
        }
        List<Map<String, Object>> list = memories.stream().map(this::memoryToMap).toList();
        return ok(Map.of("memories", list));
    }

    @GetMapping("/memory/hall")
    public ResponseEntity<Map<String, Object>> getMemoryHall(HttpSession session) {
        long userId = requireLogin(session);
        var hall = memoryService.getOrCreateHall(userId);
        List<MemoryFragment> all = memoryService.listMemories(userId);

        Map<Integer, Long> worldStats = new HashMap<>();
        for (MemoryFragment f : all) {
            worldStats.merge(f.getWorldIndex(), 1L, Long::sum);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalFragments", hall.getTotalFragments());
        data.put("unlockedFragments", hall.getUnlockedFragments());
        data.put("worldStats", worldStats);
        return ok(data);
    }

    @PostMapping("/memory/unlock")
    public ResponseEntity<Map<String, Object>> unlockMemory(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String fragmentId = (String) body.get("fragmentId");
        if (fragmentId == null) return err("缺少fragmentId");

        var opt = memoryService.getMemory(fragmentId);
        if (opt.isEmpty()) return err("记忆碎片不存在");
        MemoryFragment fragment = opt.get();
        if (fragment.getPlayerId() != userId) return err("无权操作");
        if (!fragment.isLocked()) return ok(memoryToMap(fragment));

        // 检查对应NPC缘分是否达标
        List<Relation> relations = fateService.getRelations(userId);
        MemoryFragment finalFragment = fragment;
        int currentFate = relations.stream()
                .filter(r -> r.getNpcId() != null && r.getNpcId().equals(finalFragment.getNpcId()))
                .mapToInt(Relation::getFateScore)
                .max().orElse(0);
        if (currentFate < 40) return err("缘分不足，需达到40");

        fragment = memoryService.unlockMemory(fragment);
        return ok(memoryToMap(fragment));
    }

    private Map<String, Object> memoryToMap(MemoryFragment m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("npcId", m.getNpcId());
        map.put("npcName", m.getNpcName());
        map.put("worldIndex", m.getWorldIndex());
        map.put("title", m.getTitle());
        map.put("excerpt", m.getExcerpt());
        map.put("fateScore", m.getFateScore());
        map.put("locked", m.isLocked());
        map.put("emotionTone", m.getEmotionTone());
        map.put("bookTitle", m.getBookTitle());
        map.put("createTime", m.getCreateTime());
        map.put("unlockCondition", m.getUnlockCondition());
        map.put("imageUrl", m.getImageUrl());
        map.put("affectsNextWorld", m.isAffectsNextWorld());
        return map;
    }

    // ── 宠物 ──────────────────────────────────────

    @GetMapping("/pet/list")
    public ResponseEntity<Map<String, Object>> listPets(HttpSession session) {
        long userId = requireLogin(session);
        Collection<Pet> pets = petService.listPet(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (Pet p : pets) {
            list.add(petToMap(p));
        }
        return ok(Map.of("pets", list));
    }

    @GetMapping("/pet/templates")
    public ResponseEntity<Map<String, Object>> listPetTemplates(HttpSession session) {
        long userId = requireLogin(session);
        List<PetTemplate> templates = petService.listPetTemplates();
        List<Map<String, Object>> list = new ArrayList<>();
        for (PetTemplate t : templates) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            m.put("description", t.getDescription());
            list.add(m);
        }
        return ok(Map.of("templates", list));
    }

    @PostMapping("/pet/random")
    public ResponseEntity<Map<String, Object>> randomPet(HttpSession session) {
        long userId = requireLogin(session);
        Pet pet = petService.randomPetRest(userId);
        return ok(Map.of("pet", petToMap(pet)));
    }

    @PostMapping("/pet/create")
    public ResponseEntity<Map<String, Object>> createPet(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        CreatePetMessage msg = new CreatePetMessage();
        msg.petTemplateId = body.getOrDefault("petTemplateId", "");
        msg.nickname = body.getOrDefault("nickname", "");
        msg.petType = body.getOrDefault("petType", "");
        msg.element = body.getOrDefault("element", "");
        msg.artStyle = body.getOrDefault("artStyle", "");
        Pet pet = petService.createPetRest(userId, msg);
        return ok(Map.of("pet", petToMap(pet)));
    }

    @PostMapping("/pet/delete")
    public ResponseEntity<Map<String, Object>> deletePet(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        petService.deletePetRest(userId, body.get("petId"));
        return ok(Map.of("success", true));
    }

    // ── 技能 ──────────────────────────────────────

    @GetMapping("/skill/templates")
    public ResponseEntity<Map<String, Object>> listSkillTemplates(HttpSession session) {
        long userId = requireLogin(session);
        List<SkillTemplate> templates = skillService.listTemplates();
        List<Map<String, Object>> list = new ArrayList<>();
        for (SkillTemplate t : templates) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            m.put("description", t.getDescription());
            m.put("branch", t.getBranch());
            m.put("type", t.getType());
            m.put("maxLevel", t.getMaxLevel());
            m.put("requiredLevel", t.getRequiredLevel());
            m.put("prerequisites", t.getPrerequisites());
            m.put("costPerLevel", t.getCostPerLevel());
            m.put("effectJson", t.getEffectJson());
            m.put("icon", t.getIcon());
            m.put("sortOrder", t.getSortOrder());
            list.add(m);
        }
        return ok(Map.of("templates", list));
    }

    @GetMapping("/skill/list")
    public ResponseEntity<Map<String, Object>> listPlayerSkills(HttpSession session) {
        long userId = requireLogin(session);
        List<PlayerSkill> skills = skillService.listPlayerSkills(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (PlayerSkill s : skills) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("skillTemplateId", s.getSkillTemplateId());
            m.put("level", s.getLevel());
            m.put("unlocked", s.isUnlocked());
            list.add(m);
        }
        return ok(Map.of("skills", list));
    }

    @PostMapping("/skill/unlock")
    public ResponseEntity<Map<String, Object>> unlockSkill(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        SkillService.UnlockResult result = skillService.unlockSkill(userId, body.get("skillTemplateId"), currency.getGold());
        if (result.goldCost() > 0) {
            currency.addGold(-result.goldCost());
            shopService.saveCurrency(currency);
        }
        PlayerSkill skill = result.skill();
        return ok(Map.of("skillTemplateId", skill.getSkillTemplateId(),
                "level", skill.getLevel(), "unlocked", skill.isUnlocked(),
                "goldCost", result.goldCost(),
                "remainingGold", currency.getGold()));
    }

    @PostMapping("/skill/upgrade")
    public ResponseEntity<Map<String, Object>> upgradeSkill(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        PlayerSkill skill = skillService.upgradeSkill(userId, body.get("skillTemplateId"));
        return ok(Map.of("skillTemplateId", skill.getSkillTemplateId(),
                "level", skill.getLevel(), "unlocked", skill.isUnlocked()));
    }

    // ── 战斗 ──────────────────────────────────────

    @PostMapping("/battle/start")
    public ResponseEntity<Map<String, Object>> startBattle(@RequestBody(required = false) Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        int[] stats = buildPlayerStats(userId);
        List<BattleState.BattleSkill> battleSkills = buildBattleSkills(userId);
        BattleState state = battleService.startBattle(userId, stats[0], stats[1], stats[2], stats[3], stats[4], stats[5], stats[6], battleSkills);
        attachBattlePortraits(userId, state);
        return ok(Map.of("battle", battleToMap(state)));
    }

    /**
     * 计算玩家最终战斗属性（基础属性 + 等级加成）
     * 返回 [hp, mp, physicsAttack, physicsDefense, magicAttack, magicDefense, speed]
     */
    private int[] buildPlayerStats(long userId) {
        Person person = personService.getPersonById(userId);
        Level level = levelService.ofLevel(userId);
        int bonus = level != null ? Math.max(0, level.getLevel() - 1) : 0;
        if (person != null && person.getBasicProperty() != null) {
            var bp = person.getBasicProperty();
            return new int[]{
                    bp.getHp() + bonus * 50,
                    bp.getMp() + bonus * 20,
                    bp.getPhysicsAttack() + bonus * 5,
                    bp.getPhysicsDefense() + bonus * 3,
                    bp.getMagicAttack() + bonus * 4,
                    bp.getMagicDefense() + bonus * 3,
                    bp.getSpeed() + bonus
            };
        }
        return new int[]{100 + bonus * 50, 50 + bonus * 20, 10 + bonus * 5, 5 + bonus * 3, 8 + bonus * 4, 5 + bonus * 3, 10 + bonus};
    }

    /** 从玩家已学技能中提取战斗技能 */
    private List<BattleState.BattleSkill> buildBattleSkills(long userId) {
        List<BattleState.BattleSkill> result = new ArrayList<>();
        List<PlayerSkill> playerSkills = skillService.listPlayerSkills(userId);
        List<SkillTemplate> templates = skillService.listTemplates();
        Map<String, SkillTemplate> templateMap = new HashMap<>();
        templates.forEach(t -> templateMap.put(t.getId(), t));

        for (PlayerSkill ps : playerSkills) {
            if (!ps.isUnlocked()) continue;
            SkillTemplate tpl = templateMap.get(ps.getSkillTemplateId());
            if (tpl == null || !"COMBAT".equalsIgnoreCase(tpl.getBranch()) || !"ACTIVE".equalsIgnoreCase(tpl.getType())) continue;

            BattleState.BattleSkill bs = new BattleState.BattleSkill();
            bs.setSkillId(tpl.getId());
            bs.setName(tpl.getName());
            bs.setIcon(tpl.getIcon() != null ? tpl.getIcon() : "✨");

            // 解析 effectJson
            if (tpl.getEffectJson() != null && !tpl.getEffectJson().isBlank()) {
                try {
                    var effectMap = JSON.parseObject(tpl.getEffectJson());
                    bs.setMpCost(effectMap.getIntValue("mpCost"));
                    bs.setDamageMultiplier(effectMap.getDoubleValue("multiplier"));
                    bs.setEffectType(effectMap.getString("effectType"));
                } catch (Exception e) {
                    bs.setMpCost(10);
                    bs.setDamageMultiplier(1.5);
                    bs.setEffectType("physical_damage");
                }
            } else {
                bs.setMpCost(10);
                bs.setDamageMultiplier(1.5);
                bs.setEffectType("physical_damage");
            }
            result.add(bs);
        }
        return result;
    }

    @GetMapping("/battle/state")
    public ResponseEntity<Map<String, Object>> getBattleState(HttpSession session) {
        long userId = requireLogin(session);
        BattleState state = battleService.getBattleState(userId);
        if (state == null) return ok(Map.of("battle", Map.of()));
        return ok(Map.of("battle", battleToMap(state)));
    }

    @PostMapping("/battle/action")
    public ResponseEntity<Map<String, Object>> battleAction(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        String actionType = body.getOrDefault("actionType", "ATTACK");
        String targetId = body.get("targetId");
        String skillId = body.get("skillId");
        BattleState state = battleService.executeAction(userId, actionType, targetId, skillId);
        if (state == null) return err("无进行中的战斗");

        Map<String, Object> battleMap = battleToMap(state);
        // 胜利时发放奖励
        if ("VICTORY".equals(state.getStatus())) {
            Map<String, Object> rewardDetail = distributeBattleRewards(userId, state);
            battleMap.put("rewardDetail", rewardDetail);
        }
        return ok(Map.of("battle", battleMap));
    }

    /** 发放战斗胜利奖励 */
    private Map<String, Object> distributeBattleRewards(long userId, BattleState state) {
        Random rng = new Random();
        int rewardGold = 80 + rng.nextInt(41); // 80~120
        int rewardExp = 40 + rng.nextInt(21);   // 40~60

        // 发放金币
        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        currency.addGold(rewardGold);
        shopService.saveCurrency(currency);

        // 实际发放经验并自动检查升级
        LevelService.LevelUpResult levelResult = levelService.addExpWithAutoLevelUp(userId, rewardExp);
        Level newLevel = levelResult.level();
        grantAttributePoints(userId, levelResult.levelsGained());
        PersonLevelConfig nextConfig = levelService.getPersonLevelConfigByLevel(newLevel.getLevel());

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("gold", rewardGold);
        detail.put("exp", rewardExp);
        detail.put("currentLevel", newLevel.getLevel());
        detail.put("currentExp", newLevel.getExp());
        detail.put("maxExp", nextConfig != null ? nextConfig.getExp() : 0);

        // 25% 掉落消耗品
        String[] consumablePool = {"consumable_001", "consumable_002", "consumable_003"};
        if (rng.nextInt(4) == 0) {
            String dropId = consumablePool[rng.nextInt(consumablePool.length)];
            ShopItem dropItem = shopService.getItem(dropId);
            if (dropItem != null) {
                BagItem bagItem = new BagItem();
                bagItem.setId(dropId);
                bagItem.setItemTypeId(dropId);
                bagItem.setQuantity(1);
                bagService.incrementItem(bagItem, userId);
                detail.put("dropItem", dropItem.getName());
                detail.put("dropIcon", dropItem.getIcon());
            }
        }

        // 30% 掉落装备（品质上限 rare）
        if (rng.nextInt(100) < 30) {
            Equip dropped = dropRandomEquip(userId, "rare");
            if (dropped != null) {
                ShopItem src = shopService.getItem(dropped.getItemTypeId());
                detail.put("equipDrop", src != null ? src.getName() : "神秘装备");
                detail.put("equipDropIcon", src != null ? src.getIcon() : "⚔️");
                detail.put("equipDropId", dropped.getId());
            }
        }

        return detail;
    }

    /** 为战斗单位附加立绘URL：玩家用已有立绘，怪物AI生成 */
    private void attachBattlePortraits(long userId, BattleState state) {
        // 玩家立绘
        Person person = personService.getPersonById(userId);
        if (person != null && person.getPortraitImageId() != null) {
            String playerPortrait = "/api/story/scene-image/" + person.getPortraitImageId();
            state.getPlayerUnits().forEach(u -> u.setPortraitUrl(playerPortrait));
        }
        // 怪物立绘（同步生成，使用缓存避免重复）
        for (BattleUnit enemy : state.getEnemyUnits()) {
            String cacheKey = "monster_portrait_" + enemy.getName();
            String prompt = buildMonsterPortraitPrompt(enemy.getName());
            try {
                var result = sceneImageService.getOrGenerate(cacheKey, prompt);
                if (result.isPresent()) {
                    enemy.setPortraitUrl("/api/story/scene-image/" + result.get().getId());
                }
            } catch (Exception e) {
                log.warn("怪物立绘生成失败: {}", enemy.getName(), e);
            }
        }
        mongoTemplate.save(state);
    }

    private String buildMonsterPortraitPrompt(String monsterName) {
        return "仙侠CG插画风，怪物立绘，" + monsterName + "，"
                + "凶猛的妖兽形态，气势威严，带有灵气/妖气光效，"
                + "单体全身立绘完整清晰，主体居中占画面80%以上，"
                + "主体配色鲜艳，禁止纯黑色身体，"
                + "【背景】纯黑色(#000000)，无纹理无光晕，"
                + "主体与背景边界清晰，无颜色溢出，高清8K";
    }

    // ── 商城 ──────────────────────────────────────

    @GetMapping("/shop/list")
    public ResponseEntity<Map<String, Object>> listShopItems(
            @RequestParam(required = false) String category, HttpSession session) {
        long userId = requireLogin(session);
        List<ShopItem> items = shopService.listItems(category);
        List<Map<String, Object>> list = new ArrayList<>();
        for (ShopItem item : items) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", item.getId());
            m.put("name", item.getName());
            m.put("icon", item.getIcon());
            m.put("description", item.getDescription());
            m.put("price", item.getPrice());
            m.put("currency", item.getCurrency());
            m.put("category", item.getCategory());
            m.put("quality", item.getQuality());
            m.put("isHot", item.isHot());
            m.put("stock", item.getStock());
            if (item.getAttributes() != null && !item.getAttributes().isEmpty()) {
                m.put("attributes", item.getAttributes());
            }
            if (item.getEquipPosition() > 0) {
                m.put("equipPosition", item.getEquipPosition());
            }
            list.add(m);
        }
        return ok(Map.of("items", list));
    }

    @GetMapping("/shop/currency")
    public ResponseEntity<Map<String, Object>> getPlayerCurrency(HttpSession session) {
        long userId = requireLogin(session);
        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        return ok(Map.of("gold", currency.getGold(), "diamond", currency.getDiamond()));
    }

    @PostMapping("/shop/purchase")
    public ResponseEntity<Map<String, Object>> purchaseItem(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String itemId = (String) body.get("itemId");
        int quantity = ((Number) body.getOrDefault("quantity", 1)).intValue();
        Map<String, Object> result = shopService.purchaseItem(userId, itemId, quantity);
        if (Boolean.TRUE.equals(result.get("success"))) {
            ShopItem shopItem = shopService.getItem(itemId);
            if (shopItem != null) {
                deliverShopItemToBag(userId, shopItem, quantity);
            }
        }
        return ok(result);
    }

    /** 商城物品发放：装备类创建 Equip 实体，其他放背包 */
    private void deliverShopItemToBag(long userId, ShopItem shopItem, int quantity) {
        if (shopItem.getEquipPosition() > 0) {
            for (int i = 0; i < quantity; i++) {
                generateEquipFromShopItem(userId, shopItem);
            }
        } else {
            BagItem bagItem = new BagItem();
            bagItem.setId(shopItem.getId());
            bagItem.setItemTypeId(shopItem.getId());
            bagItem.setQuantity(quantity);
            bagService.incrementItem(bagItem, userId);
        }
    }

    /** 根据商城装备配置创建真实 Equip 实体 */
    private Equip generateEquipFromShopItem(long userId, ShopItem shopItem) {
        Map<String, Integer> attrs = shopItem.getAttributes();
        int baseAtk = attrVal(attrs, "物攻");
        int baseMAtk = attrVal(attrs, "法攻");
        int baseDef = attrVal(attrs, "物防");
        int baseMDef = attrVal(attrs, "法防");
        int baseHp = attrVal(attrs, "生命");
        int baseMp = attrVal(attrs, "法力");
        int baseSpd = attrVal(attrs, "速度");

        Random rng = new Random();
        double variance = 0.85 + rng.nextDouble() * 0.3; // 0.85~1.15 随机浮动

        FixedEquipProperty fixed = FixedEquipProperty.builder()
                .hp((int)(baseHp * variance))
                .mp((int)(baseMp * variance))
                .physicsAttack((int)(baseAtk * variance))
                .physicsDefense((int)(baseDef * variance))
                .magicAttack((int)(baseMAtk * variance))
                .magicDefense((int)(baseMDef * variance))
                .speed((int)(baseSpd * variance))
                .build();

        int qualityIdx = qualityToIndex(shopItem.getQuality());
        int totalAttr = 10 + qualityIdx * 8 + rng.nextInt(10);

        Equip equip = Equip.builder()
                .itemTypeId(shopItem.getId())
                .userId(userId)
                .position(shopItem.getEquipPosition())
                .level(1)
                .quality(qualityIdx)
                .fixedEquipProperty(fixed)
                .fixedEquipPropertyMin(fixed)
                .fixedEquipPropertyMax(fixed)
                .attrTotal(totalAttr)
                .undistributedAttr(totalAttr)
                .elseEquipProperty(ElseEquipProperty.resetElseEquipProperty())
                .totalAttrMin(totalAttr - 5)
                .totalAttrMax(totalAttr + 5)
                .equipTemplateId(shopItem.getId())
                .build();

        equipService.save(equip);
        return equip;
    }

    /** 随机掉落一件装备（按最大品质筛选） */
    private Equip dropRandomEquip(long userId, String maxQuality) {
        List<ShopItem> pool = shopService.listEquipItemsByMaxQuality(maxQuality);
        if (pool.isEmpty()) return null;
        ShopItem chosen = pool.get(new Random().nextInt(pool.size()));
        return generateEquipFromShopItem(userId, chosen);
    }

    private int attrVal(Map<String, Integer> attrs, String key) {
        return attrs != null && attrs.containsKey(key) ? attrs.get(key) : 0;
    }

    private int qualityToIndex(String quality) {
        return switch (quality) {
            case "uncommon" -> 1;
            case "rare" -> 2;
            case "epic" -> 3;
            case "legendary" -> 4;
            default -> 0;
        };
    }

    @GetMapping("/shop/history")
    public ResponseEntity<Map<String, Object>> purchaseHistory(HttpSession session) {
        long userId = requireLogin(session);
        List<PurchaseHistory> history = shopService.getPurchaseHistory(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (PurchaseHistory h : history) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("itemId", h.getItemId());
            m.put("itemName", h.getItemName());
            m.put("quantity", h.getQuantity());
            m.put("price", h.getPrice());
            m.put("currency", h.getCurrency());
            m.put("timestamp", h.getTimestamp());
            list.add(m);
        }
        return ok(Map.of("history", list));
    }

    // ── 附魔 ──────────────────────────────────────

    @GetMapping("/enchant/{equipId}")
    public ResponseEntity<Map<String, Object>> getEnchantInfo(@PathVariable String equipId, HttpSession session) {
        long userId = requireLogin(session);
        EquipEnchant enchant = enchantService.getOrCreateEnchant(equipId, userId);
        return ok(enchantToMap(enchant));
    }

    @PostMapping("/enchant/apply")
    public ResponseEntity<Map<String, Object>> applyEnchant(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String equipId = (String) body.get("equipId");
        int runeLevel = ((Number) body.getOrDefault("runeLevel", 1)).intValue();
        EnchantRune.RuneLevel level = EnchantRune.RuneLevel.values()[Math.min(runeLevel - 1, 3)];
        EquipEnchant enchant = enchantService.enchantEquip(equipId, userId, level);
        return ok(enchantToMap(enchant));
    }

    @PostMapping("/enchant/prestige")
    public ResponseEntity<Map<String, Object>> prestigeEnchant(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String equipId = (String) body.get("equipId");
        EquipEnchant enchant = enchantService.prestigeEnchant(equipId, userId);
        return ok(enchantToMap(enchant));
    }

    // ── 装备加品 ──────────────────────────────────────

    @PostMapping("/equip/upgrade-grade")
    public ResponseEntity<Map<String, Object>> upgradeGrade(@RequestBody Map<String, Object> body, HttpSession session) {
        requireLogin(session);
        String equipId = (String) body.get("equipId");
        Equip equip = equipService.upgradeGrade(equipId);
        return ok(Map.of("equipId", equip.getId(), "grade", equip.getGrade(),
                "attrTotal", equip.getAttrTotal(), "success", equip.getGrade() > 0));
    }

    @PostMapping("/equip/furnace-upgrade")
    public ResponseEntity<Map<String, Object>> furnaceUpgrade(@RequestBody Map<String, Object> body, HttpSession session) {
        requireLogin(session);
        String equipId = (String) body.get("equipId");
        Equip equip = equipService.furnaceUpgrade(equipId);
        return ok(Map.of("equipId", equip.getId(), "furnaceGrade", equip.getFurnaceGrade(),
                "attrTotal", equip.getAttrTotal(), "success", equip.getFurnaceGrade() > 0));
    }

    // ── 副本 ──────────────────────────────────────

    @GetMapping("/dungeon/list")
    public ResponseEntity<Map<String, Object>> listDungeons(HttpSession session) {
        long userId = requireLogin(session);
        List<Dungeon> dungeons = adventureService.listDungeons(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (Dungeon d : dungeons) {
            list.add(dungeonToMap(d));
        }
        return ok(Map.of("dungeons", list));
    }

    @PostMapping("/dungeon/enter")
    public ResponseEntity<Map<String, Object>> enterDungeon(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String dungeonId = (String) body.get("dungeonId");
        int difficulty = ((Number) body.getOrDefault("difficulty", 1)).intValue();
        Dungeon d = adventureService.enterDungeon(userId, dungeonId, difficulty);
        return ok(Map.of("dungeon", dungeonToMap(d)));
    }

    /** 挑战副本当前关卡（发起战斗） */
    @PostMapping("/dungeon/challenge")
    public ResponseEntity<Map<String, Object>> challengeDungeonStage(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String dungeonId = (String) body.get("dungeonId");

        Dungeon.StageInfo stageInfo = adventureService.getCurrentStageInfo(userId, dungeonId);
        if (stageInfo == null) return err("当前无可挑战的关卡");

        // 获取副本难度
        Dungeon dungeon = adventureService.listDungeons(userId).stream()
            .filter(d -> dungeonId.equals(d.getDungeonId())).findFirst().orElse(null);
        int difficulty = dungeon != null ? dungeon.getDifficulty() : 1;

        int[] stats = buildPlayerStats(userId);
        List<BattleState.BattleSkill> battleSkills = buildBattleSkills(userId);
        BattleState state = battleService.startDungeonBattle(userId,
            stageInfo.getEnemyName(), stageInfo.getEnemyLevel(),
            stageInfo.isBoss(), difficulty,
            stats[0], stats[1], stats[2], stats[3], stats[4], stats[5], stats[6], battleSkills);
        attachBattlePortraits(userId, state);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("battle", battleToMap(state));
        result.put("stageInfo", stageInfoToMap(stageInfo));
        result.put("dungeonId", dungeonId);
        return ok(result);
    }

    /** 副本关卡战斗胜利后结算 */
    @PostMapping("/dungeon/settle")
    public ResponseEntity<Map<String, Object>> settleDungeonStage(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String dungeonId = (String) body.get("dungeonId");
        int stars = ((Number) body.getOrDefault("stars", 3)).intValue();

        Dungeon dungeon = adventureService.listDungeons(userId).stream()
            .filter(d -> dungeonId.equals(d.getDungeonId())).findFirst().orElse(null);
        if (dungeon == null || dungeon.getStatus() != Dungeon.DungeonStatus.IN_PROGRESS) {
            return err("副本状态异常");
        }

        int currentStage = dungeon.getCurrentStage();
        Dungeon.StageInfo stageInfo = dungeon.getStages().stream()
            .filter(s -> s.getStageId() == currentStage).findFirst().orElse(null);

        // 发放关卡奖励
        Map<String, Object> stageReward = new LinkedHashMap<>();
        if (stageInfo != null && stageInfo.getReward() != null) {
            stageReward = distributeStageReward(userId, stageInfo.getReward());
        }

        // 推进副本进度
        Dungeon updated = adventureService.completeStage(userId, dungeonId, currentStage, stars);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dungeon", dungeonToMap(updated));
        result.put("stageReward", stageReward);

        // 通关奖励
        if (updated.getStatus() == Dungeon.DungeonStatus.COMPLETED && updated.getReward() != null) {
            result.put("clearReward", distributeDungeonRewards(userId, updated.getReward()));
            // 首通额外奖励
            if (updated.getClearCount() == 1 && updated.getFirstClearReward() != null) {
                result.put("firstClearReward", distributeDungeonRewards(userId, updated.getFirstClearReward()));
            }
        }

        return ok(result);
    }

    /** 副本关卡战斗失败 */
    @PostMapping("/dungeon/fail")
    public ResponseEntity<Map<String, Object>> failDungeonStage(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String dungeonId = (String) body.get("dungeonId");
        Dungeon d = adventureService.failDungeon(userId, dungeonId);
        return ok(Map.of("dungeon", dungeonToMap(d)));
    }

    private Map<String, Object> distributeStageReward(long userId, Dungeon.StageReward reward) {
        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        if (reward.getGold() > 0) currency.addGold(reward.getGold());
        shopService.saveCurrency(currency);

        if (reward.getExp() > 0) grantAttributePoints(userId, levelService.addExpWithAutoLevelUp(userId, reward.getExp()).levelsGained());

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("gold", reward.getGold());
        detail.put("exp", reward.getExp());

        List<Map<String, Object>> droppedItems = new ArrayList<>();
        if (reward.getItems() != null) {
            for (Dungeon.ItemDrop drop : reward.getItems()) {
                BagItem bagItem = new BagItem();
                bagItem.setId(drop.getItemId());
                bagItem.setItemTypeId(drop.getItemId());
                bagItem.setQuantity(drop.getQuantity());
                bagService.incrementItem(bagItem, userId);
                droppedItems.add(Map.of("itemName", drop.getItemName(), "quantity", drop.getQuantity(), "rarity", drop.getRarity()));
            }
        }

        // 40% 概率掉落装备（副本品质上限 epic）
        Random rng = new Random();
        if (rng.nextInt(100) < 40) {
            Equip dropped = dropRandomEquip(userId, "epic");
            if (dropped != null) {
                ShopItem src = shopService.getItem(dropped.getItemTypeId());
                String name = src != null ? src.getName() : "神秘装备";
                droppedItems.add(Map.of("itemName", name, "quantity", 1, "rarity", src != null ? src.getQuality() : "rare"));
                detail.put("equipDrop", name);
                detail.put("equipDropId", dropped.getId());
            }
        }

        detail.put("items", droppedItems);
        return detail;
    }

    /** 发放副本通关奖励 */
    private Map<String, Object> distributeDungeonRewards(long userId, Dungeon.DungeonReward reward) {
        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        if (reward.getGold() > 0) currency.addGold(reward.getGold());
        shopService.saveCurrency(currency);

        if (reward.getExp() > 0) grantAttributePoints(userId, levelService.addExpWithAutoLevelUp(userId, reward.getExp()).levelsGained());

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("gold", reward.getGold());
        detail.put("exp", reward.getExp());

        List<Map<String, Object>> droppedItems = new ArrayList<>();
        if (reward.getItems() != null) {
            for (Dungeon.ItemDrop drop : reward.getItems()) {
                BagItem bagItem = new BagItem();
                bagItem.setId(drop.getItemId());
                bagItem.setItemTypeId(drop.getItemId());
                bagItem.setQuantity(drop.getQuantity());
                bagService.incrementItem(bagItem, userId);
                droppedItems.add(Map.of("itemName", drop.getItemName(), "quantity", drop.getQuantity(), "rarity", drop.getRarity()));
            }
        }
        detail.put("items", droppedItems);

        if (reward.getTitle() != null) detail.put("title", reward.getTitle());
        if (reward.getAchievement() != null) detail.put("achievement", reward.getAchievement());

        return detail;
    }

    @PostMapping("/dungeon/exit")
    public ResponseEntity<Map<String, Object>> exitDungeon(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        Dungeon d = adventureService.exitDungeon(userId, body.get("dungeonId"));
        return ok(Map.of("dungeon", dungeonToMap(d)));
    }

    // ── 图鉴 ──────────────────────────────────────

    @GetMapping("/codex/npc")
    public ResponseEntity<Map<String, Object>> codexNpc(HttpSession session) {
        long userId = requireLogin(session);
        List<NpcTemplate> npcs = npcTemplateRepository.findAll();
        List<Relation> relations = fateService.getRelations(userId);
        Set<String> met = new HashSet<>();
        relations.forEach(r -> met.add(r.getNpcId()));
        List<Map<String, Object>> list = new ArrayList<>();
        for (NpcTemplate npc : npcs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("npcId", npc.getNpcId());
            m.put("npcName", npc.getNpcName());
            m.put("personality", npc.getPersonality());
            m.put("role", npc.getRole());
            m.put("unlocked", met.contains(npc.getNpcId()));
            list.add(m);
        }
        return ok(Map.of("npcs", list, "total", npcs.size(), "unlocked", met.size()));
    }

    @GetMapping("/codex/equip")
    public ResponseEntity<Map<String, Object>> codexEquip(HttpSession session) {
        long userId = requireLogin(session);
        List<Equip> equips = equipService.listByUser(userId);
        Set<String> collected = new HashSet<>();
        equips.forEach(e -> collected.add(e.getItemTypeId()));
        List<Map<String, Object>> list = new ArrayList<>();
        for (Equip e : equips) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("itemTypeId", e.getItemTypeId());
            m.put("level", e.getLevel());
            m.put("quality", e.getQuality());
            list.add(m);
        }
        return ok(Map.of("equips", list, "totalTypes", collected.size()));
    }

    @GetMapping("/codex/pet")
    public ResponseEntity<Map<String, Object>> codexPet(HttpSession session) {
        long userId = requireLogin(session);
        var pets = petService.listPet(userId);
        var templates = petService.listPetTemplates();
        Set<String> owned = new HashSet<>();
        pets.forEach(p -> owned.add(p.getPetTemplateId()));
        List<Map<String, Object>> list = new ArrayList<>();
        for (var t : templates) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            m.put("description", t.getDescription());
            m.put("unlocked", owned.contains(t.getId()));
            list.add(m);
        }
        return ok(Map.of("pets", list, "total", templates.size(), "unlocked", owned.size()));
    }

    // ── 排行榜 ──────────────────────────────────────

    @GetMapping("/rank/list")
    public ResponseEntity<Map<String, Object>> getRankList(
            @RequestParam(defaultValue = "level") String type,
            @RequestParam(defaultValue = "20") int limit,
            HttpSession session) {
        long userId = requireLogin(session);
        List<RankEntry> entries = rankService.getRank(type, limit);
        int myRank = rankService.getPlayerRank(type, userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (RankEntry e : entries) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rank", e.getRank());
            m.put("playerId", e.getPlayerId());
            m.put("playerName", e.getPlayerName());
            m.put("level", e.getLevel());
            m.put("value", e.getValue());
            list.add(m);
        }
        return ok(Map.of("entries", list, "myRank", myRank));
    }

    // ── 灵侣 ──────────────────────────────────────

    @GetMapping("/companion/list")
    public ResponseEntity<Map<String, Object>> listCompanions(HttpSession session) {
        long userId = requireLogin(session);
        List<SpiritCompanion> companions = companionService.listCompanions(userId);
        return ok(Map.of("companions", companions.stream().map(this::companionToMap).toList()));
    }

    // ── 探索 ──────────────────────────────────────

    @GetMapping("/explore/status")
    public ResponseEntity<Map<String, Object>> exploreStatus(HttpSession session) {
        long userId = requireLogin(session);
        return ok(exploreService.getStatus(userId));
    }

    @PostMapping("/explore/action")
    public ResponseEntity<Map<String, Object>> exploreAction(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        int worldIndex = body.get("worldIndex") != null ? ((Number) body.get("worldIndex")).intValue() : 0;
        String bookTitle = (String) body.getOrDefault("bookTitle", "未知世界");

        ExploreEvent event = exploreService.explore(userId, worldIndex, bookTitle, calcDejaVuChance(userId));
        return ok(Map.of("event", exploreEventToMap(event)));
    }

    /** 计算前世回响概率（基于REBIRTH技能） */
    private double calcDejaVuChance(long userId) {
        List<PlayerSkill> skills = skillService.listPlayerSkills(userId);
        for (PlayerSkill ps : skills) {
            if (ps.isUnlocked() && "rebirth_deja_vu".equals(ps.getSkillTemplateId())) {
                SkillTemplate tpl = skillService.getTemplate(ps.getSkillTemplateId());
                if (tpl != null && tpl.getEffectJson() != null) {
                    try {
                        var eff = JSON.parseObject(tpl.getEffectJson());
                        double base = eff.getDoubleValue("dejaVuChance");
                        return base * ps.getLevel(); // 等级越高概率越大
                    } catch (Exception ignored) {}
                }
            }
        }
        return 0;
    }

    @PostMapping("/explore/resolve")
    public ResponseEntity<Map<String, Object>> exploreResolve(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String eventId = (String) body.get("eventId");
        int choiceId = ((Number) body.get("choiceId")).intValue();
        Map<String, Object> reward = exploreService.resolveChoice(userId, eventId, choiceId);
        applyExploreRewards(userId, eventId, reward);
        return ok(reward);
    }

    @GetMapping("/explore/history")
    public ResponseEntity<Map<String, Object>> exploreHistory(HttpSession session) {
        long userId = requireLogin(session);
        List<ExploreEvent> events = exploreService.getHistory(userId);
        return ok(Map.of("events", events.stream().map(this::exploreEventToMap).toList()));
    }

    @PostMapping("/explore/start-combat")
    public ResponseEntity<Map<String, Object>> exploreStartCombat(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String eventId = (String) body.get("eventId");
        if (personService.getPersonById(userId) == null) {
            return err("角色未初始化，请先创建角色");
        }
        String enemyName = (String) body.getOrDefault("enemyName", "妖兽");
        int[] stats = buildPlayerStats(userId);
        BattleState state = battleService.startBattleWithEnemy(userId, enemyName,
                stats[0], stats[1], stats[2], stats[3], stats[4], stats[5], stats[6]);
        exploreService.linkBattle(eventId, state.getId());
        attachBattlePortraits(userId, state);
        return ok(Map.of("battle", battleToMap(state)));
    }

    @PostMapping("/explore/resolve-combat")
    public ResponseEntity<Map<String, Object>> exploreResolveCombat(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String eventId = (String) body.get("eventId");
        BattleState state = battleService.getBattleState(userId);
        boolean victory = state != null && "VICTORY".equals(state.getStatus());
        Map<String, Object> reward = exploreService.resolveCombat(userId, eventId, victory);
        applyExploreRewards(userId, eventId, reward);
        return ok(reward);
    }

    /**
     * 将探索/战斗奖励真正发放到各子系统（缘分、记忆、背包）
     */
    private void applyExploreRewards(long userId, String eventId, Map<String, Object> reward) {
        try {
            // 获取事件上下文（worldIndex、npcId、bookTitle）
            ExploreEvent event = exploreService.getEvent(eventId);
            int worldIndex = event != null ? event.getWorldIndex() : 0;
            String bookTitle = event != null && event.getBookTitle() != null ? event.getBookTitle() : "未知世界";
            String npcId = event != null ? event.getNpcId() : null;

            // 1. 缘分/信任变化 → FateService
            int fateDelta = reward.get("fateDelta") instanceof Number n ? n.intValue() : 0;
            int trustDelta = reward.get("trustDelta") instanceof Number n ? n.intValue() : 0;
            if ((fateDelta != 0 || trustDelta != 0) && npcId != null && !npcId.isBlank()) {
                fateService.applyChoice(userId, npcId, worldIndex, fateDelta, trustDelta);
            }

            // 2. 记忆碎片 → MemoryService
            String memoryTitle = (String) reward.get("memoryTitle");
            if (memoryTitle != null && !memoryTitle.isBlank()) {
                String npcName = event != null && event.getEnemyName() != null ? event.getEnemyName() : "书中人";
                String targetNpcId = npcId != null ? npcId : "explore_" + eventId;
                int fateScore = fateDelta > 0 ? fateDelta : 0;
                memoryService.createMemory(userId, targetNpcId, npcName, worldIndex, bookTitle, fateScore, memoryTitle);
            }

            // 3. 物品奖励 → 装备或消耗品
            String itemName = (String) reward.get("itemName");
            if (itemName != null && !itemName.isBlank()) {
                if (isEquipItemName(itemName)) {
                    // 探索获得装备
                    dropRandomEquip(userId, "rare");
                } else {
                    String mappedItemId = mapExploreItemToShopItem(itemName);
                    BagItem bagItem = new BagItem();
                    bagItem.setId(mappedItemId);
                    bagItem.setItemTypeId(mappedItemId);
                    bagItem.setQuantity(1);
                    bagService.incrementItem(bagItem, userId);
                }
            }

            // 4. 金币奖励
            int goldReward = reward.get("gold") instanceof Number n ? n.intValue() : 0;
            if (goldReward > 0) {
                PlayerCurrency currency = shopService.getPlayerCurrency(userId);
                currency.addGold(goldReward);
                shopService.saveCurrency(currency);
            }

            // 5. 探索经验奖励（固定20经验）
            grantAttributePoints(userId, levelService.addExpWithAutoLevelUp(userId, 20).levelsGained());
        } catch (Exception e) {
            log.warn("探索奖励发放异常: userId={}, eventId={}, err={}", userId, eventId, e.getMessage());
        }
    }

    /** 判断探索物品名是否为装备类 */
    private boolean isEquipItemName(String itemName) {
        if (itemName == null) return false;
        String lower = itemName.toLowerCase();
        return lower.contains("剑") || lower.contains("刀") || lower.contains("杖") || lower.contains("锤")
                || lower.contains("弓") || lower.contains("枪") || lower.contains("weapon") || lower.contains("sword")
                || lower.contains("甲") || lower.contains("铠") || lower.contains("袍") || lower.contains("armor")
                || lower.contains("戒") || lower.contains("链") || lower.contains("坠") || lower.contains("珠")
                || lower.contains("项链") || lower.contains("ring") || lower.contains("accessory");
    }

    /** 将AI生成的探索物品名映射到商城预定义物品ID */
    private String mapExploreItemToShopItem(String itemName) {
        if (itemName == null) return "consumable_001";
        String lower = itemName.toLowerCase();
        if (lower.contains("药") || lower.contains("heal") || lower.contains("生命")) return "consumable_001";
        if (lower.contains("魔") || lower.contains("mana") || lower.contains("法力")) return "consumable_002";
        if (lower.contains("经验") || lower.contains("exp")) return "consumable_003";
        if (lower.contains("附魔") || lower.contains("符") || lower.contains("材料")) return "material_001";
        if (lower.contains("矿") || lower.contains("精炼")) return "material_002";
        if (lower.contains("卷轴") || lower.contains("scroll") || lower.contains("传送")) return "special_002";
        if (lower.contains("蛋") || lower.contains("egg") || lower.contains("宠物")) return "special_001";
        return "consumable_001";
    }

    // ── 签到系统 ──────────────────────────────────────

    @GetMapping("/checkin/status")
    public ResponseEntity<Map<String, Object>> checkinStatus(HttpSession session) {
        long userId = requireLogin(session);
        Map<String, Object> checkinData = getOrInitCheckinData(session);
        String today = java.time.LocalDate.now().toString();
        String lastDate = (String) checkinData.getOrDefault("lastCheckinDate", "");
        if (!today.equals(lastDate)) {
            checkinData.put("todayChecked", false);
            String yesterday = java.time.LocalDate.now().minusDays(1).toString();
            if (!yesterday.equals(lastDate) && !lastDate.isEmpty()) {
                checkinData.put("consecutiveDays", 0);
            }
        }
        session.setAttribute("checkin", checkinData);
        return ok(Map.of(
                "todayChecked", checkinData.get("todayChecked"),
                "consecutiveDays", checkinData.get("consecutiveDays"),
                "totalDays", checkinData.get("totalDays")
        ));
    }

    @PostMapping("/checkin/do")
    public ResponseEntity<Map<String, Object>> doCheckin(HttpSession session) {
        long userId = requireLogin(session);
        Map<String, Object> checkinData = getOrInitCheckinData(session);
        boolean todayChecked = (boolean) checkinData.getOrDefault("todayChecked", false);
        if (todayChecked) return err("今日已签到");

        String today = java.time.LocalDate.now().toString();
        String lastDate = (String) checkinData.getOrDefault("lastCheckinDate", "");
        String yesterday = java.time.LocalDate.now().minusDays(1).toString();

        int consecutive = (int) checkinData.getOrDefault("consecutiveDays", 0);
        int total = (int) checkinData.getOrDefault("totalDays", 0);

        consecutive = (yesterday.equals(lastDate) || lastDate.isEmpty()) ? consecutive + 1 : 1;
        total++;

        checkinData.put("todayChecked", true);
        checkinData.put("consecutiveDays", consecutive);
        checkinData.put("totalDays", total);
        checkinData.put("lastCheckinDate", today);
        session.setAttribute("checkin", checkinData);

        int goldReward = 100 + (consecutive - 1) * 50;
        try { shopService.addCurrency(userId, goldReward, 0); } catch (Exception ignored) {}

        String[] rewardNames = {"金币×100", "附魔符×1", "金币×200", "宠物蛋×1", "金币×300", "钻石×10", "传说宝箱"};
        String reward = rewardNames[(consecutive - 1) % 7];

        return ok(Map.of("todayChecked", true, "consecutiveDays", consecutive, "totalDays", total, "reward", reward));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getOrInitCheckinData(HttpSession session) {
        Map<String, Object> data = (Map<String, Object>) session.getAttribute("checkin");
        if (data == null) {
            data = new LinkedHashMap<>();
            data.put("todayChecked", false);
            data.put("consecutiveDays", 0);
            data.put("totalDays", 0);
            data.put("lastCheckinDate", "");
        }
        return data;
    }

    // ── 成就系统 ──────────────────────────────────────

    @GetMapping("/achievement/list")
    public ResponseEntity<Map<String, Object>> achievementList(HttpSession session) {
        long userId = requireLogin(session);
        List<Map<String, Object>> achievements = new ArrayList<>();

        List<Relation> relations = fateService.getRelations(userId);
        achievements.add(makeAchievement("ach_social_1", "初次邂逅", "与1位NPC建立缘分", "social", "💬",
                relations.size(), 1, "金币×200"));
        achievements.add(makeAchievement("ach_social_2", "广结善缘", "与5位NPC建立缘分", "social", "🤝",
                relations.size(), 5, "钻石×5"));
        achievements.add(makeAchievement("ach_social_3", "知己难求", "与任意NPC缘分达到80", "social", "💞",
                relations.stream().mapToInt(Relation::getFateScore).max().orElse(0), 80, "传说宝箱×1"));

        int exploreCount = exploreService.getTodayCount(userId);
        achievements.add(makeAchievement("ach_explore_1", "初涉江湖", "完成1次探索", "explore", "🗺️",
                Math.max(exploreCount, relations.isEmpty() ? 0 : 1), 1, "金币×100"));
        achievements.add(makeAchievement("ach_explore_2", "踏遍山河", "完成20次探索", "explore", "🏔️",
                exploreCount, 20, "钻石×10"));

        Collection<Pet> pets = petService.listPet(userId);
        achievements.add(makeAchievement("ach_collect_1", "初为驯兽师", "拥有1只宠物", "collect", "🐾",
                pets.size(), 1, "金币×200"));
        achievements.add(makeAchievement("ach_collect_2", "百兽之王", "拥有5只宠物", "collect", "👑",
                pets.size(), 5, "传说宝箱×1"));

        List<Equip> equips = equipService.listByUser(userId);
        achievements.add(makeAchievement("ach_collect_3", "初窥门径", "获得1件装备", "collect", "⚔️",
                equips.size(), 1, "金币×100"));

        List<MemoryFragment> memories = memoryService.listMemories(userId);
        achievements.add(makeAchievement("ach_growth_1", "记忆拾荒者", "收集3个记忆碎片", "growth", "🌙",
                (int) memories.stream().filter(m -> !m.isLocked()).count(), 3, "金币×300"));
        achievements.add(makeAchievement("ach_growth_2", "七世之约", "完成1次轮回", "growth", "♻️",
                rebirthService.getRebirthCount(userId), 1, "钻石×20"));

        achievements.add(makeAchievement("ach_battle_1", "初战告捷", "赢得1场战斗", "battle", "⚔️",
                battleService.getVictoryCount(userId), 1, "金币×200"));
        achievements.add(makeAchievement("ach_battle_2", "百战百胜", "赢得10场战斗", "battle", "🏆",
                battleService.getVictoryCount(userId), 10, "传说宝箱×1"));

        int totalUnlocked = (int) achievements.stream().filter(a -> (boolean) a.get("unlocked")).count();

        return ok(Map.of("achievements", achievements, "totalUnlocked", totalUnlocked, "totalCount", achievements.size()));
    }

    @PostMapping("/achievement/claim")
    public ResponseEntity<Map<String, Object>> claimAchievement(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        shopService.addCurrency(userId, 200, 0);
        return ok(Map.of("reward", "金币×200"));
    }

    private Map<String, Object> makeAchievement(String id, String name, String desc, String category,
                                                  String icon, int progress, int target, String reward) {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("id", id);
        a.put("name", name);
        a.put("description", desc);
        a.put("category", category);
        a.put("icon", icon);
        a.put("progress", Math.min(progress, target));
        a.put("target", target);
        a.put("unlocked", progress >= target);
        a.put("reward", reward);
        a.put("unlockedAt", progress >= target ? java.time.LocalDate.now().toString() : null);
        return a;
    }

    // ── 灵侣增强 ──────────────────────────────────────

    @PostMapping("/companion/feed")
    public ResponseEntity<Map<String, Object>> feedCompanion(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        SpiritCompanion companion = companionService.feed(userId, body.get("companionId"));
        return ok(companionToMap(companion));
    }

    @PostMapping("/companion/set-active")
    public ResponseEntity<Map<String, Object>> setCompanionActive(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        companionService.setActive(userId, body.get("companionId"));
        return ok(Map.of("success", true));
    }

    @GetMapping("/companion/{companionId}/skills")
    public ResponseEntity<Map<String, Object>> companionSkills(@PathVariable String companionId, HttpSession session) {
        long userId = requireLogin(session);
        List<Map<String, Object>> skills = companionService.getSkills(companionId);
        return ok(Map.of("skills", skills != null ? skills : List.of()));
    }

    private Map<String, Object> companionToMap(SpiritCompanion c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("name", c.getName());
        m.put("realm", c.getRealm());
        m.put("type", c.getType());
        m.put("quality", c.getQuality());
        m.put("level", c.getLevel());
        m.put("bondLevel", c.getBondLevel());
        m.put("atk", c.getAtk());
        m.put("def", c.getDef());
        m.put("spd", c.getSpd());
        m.put("currentHp", c.getCurrentHp());
        m.put("maxHp", c.getMaxHp());
        if (c.getPortraitImageId() != null) {
            m.put("portraitUrl", "/api/story/scene-image/" + c.getPortraitImageId());
        }
        return m;
    }

    // ── 工具方法 ──────────────────────────────────────

    /** 升级时发放属性点（每级10点） */
    private void grantAttributePoints(long userId, int levelsGained) {
        if (levelsGained <= 0) return;
        Person person = personService.getPersonById(userId);
        if (person == null) return;
        person.setAttributePoints(person.getAttributePoints() + levelsGained * 10);
        personService.savePerson(person);
    }

    private long requireLogin(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) throw new NotLoginException();
        return userId;
    }

    private ResponseEntity<Map<String, Object>> ok(Map<String, Object> data) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("code", 0);
        resp.put("data", data);
        return ResponseEntity.ok(resp);
    }

    private ResponseEntity<Map<String, Object>> err(String msg) {
        return ResponseEntity.ok(Map.of("code", -1, "msg", msg));
    }

    private Map<String, Object> dungeonToMap(Dungeon d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("dungeonId", d.getDungeonId());
        m.put("dungeonName", d.getDungeonName());
        m.put("description", d.getDescription());
        m.put("type", d.getType() != null ? d.getType().name() : "STORY");
        m.put("currentStage", d.getCurrentStage());
        m.put("maxStage", d.getMaxStage());
        m.put("status", d.getStatus() != null ? d.getStatus().name() : "NOT_STARTED");
        m.put("difficulty", d.getDifficulty());
        m.put("recommendedLevel", d.getRecommendedLevel());
        m.put("dailyLimit", d.getDailyLimit());
        m.put("dailyRemaining", d.getDailyLimit() > 0 ? Math.max(0, d.getDailyLimit() - d.getTodayAttempts()) : -1);
        m.put("firstClear", d.isFirstClear());
        m.put("clearCount", d.getClearCount());
        m.put("bestTime", d.getBestTime());

        // 关卡信息
        List<Map<String, Object>> stages = new ArrayList<>();
        if (d.getStages() != null) {
            for (Dungeon.StageInfo s : d.getStages()) {
                stages.add(stageInfoToMap(s));
            }
        }
        m.put("stages", stages);

        // 已完成关卡进度
        List<Map<String, Object>> progress = new ArrayList<>();
        if (d.getStageProgress() != null) {
            for (Dungeon.StageProgress sp : d.getStageProgress()) {
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("stageId", sp.getStageId());
                pm.put("completed", sp.isCompleted());
                pm.put("stars", sp.getStars());
                progress.add(pm);
            }
        }
        m.put("stageProgress", progress);

        // 首通奖励预览
        if (d.getFirstClearReward() != null && !d.isFirstClear()) {
            Map<String, Object> fcr = new LinkedHashMap<>();
            fcr.put("gold", d.getFirstClearReward().getGold());
            fcr.put("exp", d.getFirstClearReward().getExp());
            fcr.put("title", d.getFirstClearReward().getTitle());
            m.put("firstClearReward", fcr);
        }
        return m;
    }

    private Map<String, Object> stageInfoToMap(Dungeon.StageInfo s) {
        Map<String, Object> sm = new LinkedHashMap<>();
        sm.put("stageId", s.getStageId());
        sm.put("stageName", s.getStageName());
        sm.put("enemyName", s.getEnemyName());
        sm.put("enemyLevel", s.getEnemyLevel());
        sm.put("isBoss", s.isBoss());
        if (s.getReward() != null) {
            Map<String, Object> sr = new LinkedHashMap<>();
            sr.put("gold", s.getReward().getGold());
            sr.put("exp", s.getReward().getExp());
            sm.put("reward", sr);
        }
        return sm;
    }

    private Map<String, Object> enchantToMap(EquipEnchant e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("equipId", e.getEquipId());
        m.put("enchantLevel", e.getEnchantLevel());
        m.put("totalAttributeBonus", e.getTotalAttributeBonus());
        m.put("guaranteeCount", e.getGuaranteeCount());
        m.put("attributeBonusPercent", e.getAttributeBonusPercent());
        return m;
    }

    private Map<String, Object> battleToMap(BattleState state) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", state.getId());
        m.put("round", state.getRound());
        m.put("status", state.getStatus());
        m.put("rewards", state.getRewards());
        m.put("playerUnits", state.getPlayerUnits().stream().map(this::unitToMap).toList());
        m.put("enemyUnits", state.getEnemyUnits().stream().map(this::unitToMap).toList());
        List<Map<String, Object>> actions = new ArrayList<>();
        for (BattleAction a : state.getActionLog()) {
            Map<String, Object> am = new LinkedHashMap<>();
            am.put("actorName", a.getActorName());
            am.put("actionType", a.getActionType());
            am.put("targetName", a.getTargetName());
            am.put("damage", a.getDamage());
            am.put("heal", a.getHeal());
            am.put("skillName", a.getSkillName());
            am.put("description", a.getDescription());
            actions.add(am);
        }
        m.put("actionLog", actions);
        // 可用技能列表
        List<Map<String, Object>> skills = new ArrayList<>();
        if (state.getAvailableSkills() != null) {
            for (BattleState.BattleSkill s : state.getAvailableSkills()) {
                Map<String, Object> sm = new LinkedHashMap<>();
                sm.put("skillId", s.getSkillId());
                sm.put("name", s.getName());
                sm.put("icon", s.getIcon());
                sm.put("mpCost", s.getMpCost());
                sm.put("damageMultiplier", s.getDamageMultiplier());
                sm.put("effectType", s.getEffectType());
                skills.add(sm);
            }
        }
        m.put("availableSkills", skills);
        return m;
    }

    private Map<String, Object> unitToMap(BattleUnit u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("unitId", u.getUnitId());
        m.put("name", u.getName());
        m.put("unitType", u.getUnitType());
        m.put("hp", u.getHp());
        m.put("maxHp", u.getMaxHp());
        m.put("mp", u.getMp());
        m.put("maxMp", u.getMaxMp());
        m.put("speed", u.getSpeed());
        m.put("defending", u.isDefending());
        m.put("portraitUrl", u.getPortraitUrl());
        return m;
    }

    private Map<String, Object> petToMap(Pet pet) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (pet == null) return m;
        m.put("id", pet.getId());
        m.put("petTemplateId", pet.getPetTemplateId());
        m.put("nickname", pet.getNickname());
        m.put("mutationExp", pet.getMutationExp());
        m.put("mutationNo", pet.getMutationNo());
        m.put("propertyPointNum", pet.getPropertyPointNum());
        m.put("tier", pet.getTier());
        m.put("tierName", PetService.getTierName(pet.getTier()));
        m.put("icon", pet.getIcon());
        m.put("constitution", pet.getConstitution());
        m.put("magicPower", pet.getMagicPower());
        m.put("power", pet.getPower());
        m.put("endurance", pet.getEndurance());
        m.put("agile", pet.getAgile());
        m.put("maxSkill", pet.getMaxSkill());
        m.put("aiImageUrl", pet.getAiImageUrl());
        m.put("petType", pet.getPetType());
        m.put("element", pet.getElement());
        if (pet.getPortraitImageId() != null) {
            m.put("portraitUrl", "/api/story/scene-image/" + pet.getPortraitImageId());
        }
        return m;
    }

    private Map<String, Object> exploreEventToMap(ExploreEvent e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("eventId", e.getEventId());
        m.put("type", e.getType());
        m.put("title", e.getTitle());
        m.put("description", e.getDescription());
        m.put("npcId", e.getNpcId());
        m.put("sceneHint", e.getSceneHint());
        m.put("enemyName", e.getEnemyName());
        m.put("battleId", e.getBattleId());
        List<Map<String, Object>> choices = new ArrayList<>();
        if (e.getChoices() != null) {
            for (ExploreEvent.Choice c : e.getChoices()) {
                choices.add(Map.of("id", c.getId(), "text", c.getText(), "risk", c.getRisk()));
            }
        }
        m.put("choices", choices);
        // 已解决的事件附带奖励快照
        if (e.isResolved() && e.getRewardMessage() != null) {
            m.put("rewardMessage", e.getRewardMessage());
            m.put("rewardFateDelta", e.getRewardFateDelta());
            m.put("rewardTrustDelta", e.getRewardTrustDelta());
            m.put("rewardItemName", e.getRewardItemName());
            m.put("rewardMemoryTitle", e.getRewardMemoryTitle());
        }
        return m;
    }

    // ── 聊天 ─────────────────────────────────────────

    @GetMapping("/chat/history")
    public ResponseEntity<Map<String, Object>> chatHistory(
            @RequestParam(defaultValue = "1") int chatType,
            @RequestParam(defaultValue = "50") int limit,
            HttpSession session) {
        long userId = requireLogin(session);
        List<ChatRecord> records;
        if (chatType == 2) {
            // 私聊需要指定对方ID，此处返回所有私聊
            records = chatService.getPrivateChatRecords(userId, 0, limit);
        } else {
            records = chatService.getWorldChatRecords(limit);
        }
        List<Map<String, Object>> messages = records.stream().map(this::chatRecordToMap).toList();
        // 按时间正序返回
        List<Map<String, Object>> sorted = new ArrayList<>(messages);
        sorted.sort(Comparator.comparingLong(m -> (long) m.get("timestamp")));
        return ok(Map.of("messages", sorted));
    }

    @GetMapping("/chat/private/{targetId}")
    public ResponseEntity<Map<String, Object>> privateChatHistory(
            @PathVariable long targetId,
            @RequestParam(defaultValue = "50") int limit,
            HttpSession session) {
        long userId = requireLogin(session);
        List<ChatRecord> records = chatService.getPrivateChatRecords(userId, targetId, limit);
        List<Map<String, Object>> messages = records.stream().map(this::chatRecordToMap).toList();
        List<Map<String, Object>> sorted = new ArrayList<>(messages);
        sorted.sort(Comparator.comparingLong(m -> (long) m.get("timestamp")));
        return ok(Map.of("messages", sorted));
    }

    @PostMapping("/chat/send")
    public ResponseEntity<Map<String, Object>> sendChatMessage(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String content = (String) body.get("content");
        int chatType = body.get("chatType") != null ? ((Number) body.get("chatType")).intValue() : 1;
        long receiverId = body.get("receiverId") != null ? ((Number) body.get("receiverId")).longValue() : 0;

        if (content == null || content.trim().isEmpty()) {
            return err("消息内容不能为空");
        }

        Person sender = personService.getPersonById(userId);
        String senderName = sender != null ? sender.getName() : "无名侠客";

        ChatRecord record = new ChatRecord();
        record.setSenderId(userId);
        record.setSenderName(senderName);
        record.setReceiverId(receiverId);
        record.setContent(content.trim());
        record.setChatType(chatType);

        ChatRecord saved = chatService.saveChatRecord(record);
        return ok(chatRecordToMap(saved));
    }

    private Map<String, Object> chatRecordToMap(ChatRecord r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("messageId", r.getId());
        m.put("senderId", r.getSenderId());
        m.put("senderName", r.getSenderName());
        m.put("receiverId", r.getReceiverId());
        m.put("content", r.getContent());
        m.put("chatType", r.getChatType());
        m.put("timestamp", r.getTimestamp());
        return m;
    }

    // ── 场景穿梭 ──────────────────────────────────────

    private static final List<Map<String, Object>> GAME_SCENES = List.of(
        Map.of("sceneId", "adventure", "name", "探险", "description", "神秘大陆，危机四伏", "requiredLevel", 1, "order", 1),
        Map.of("sceneId", "pirate", "name", "海盗", "description", "汪洋大海，寻宝夺金", "requiredLevel", 20, "order", 2),
        Map.of("sceneId", "mecha", "name", "机战", "description", "钢铁洪流，科技对决", "requiredLevel", 40, "order", 3),
        Map.of("sceneId", "sanguo", "name", "三国", "description", "群雄逐鹿，争霸天下", "requiredLevel", 60, "order", 4),
        Map.of("sceneId", "dragonball", "name", "龙珠", "description", "集齐龙珠，召唤神龙", "requiredLevel", 80, "order", 5)
    );

    @GetMapping("/scene/list")
    public ResponseEntity<Map<String, Object>> listScenes(HttpSession session) {
        long userId = requireLogin(session);
        // 获取玩家等级（简化：从person取level或默认1）
        int playerLevel = 1;
        Person person = personService.getPersonById(userId);
        if (person != null && person.getBasicProperty() != null) {
            playerLevel = Math.max(1, person.getBasicProperty().getHp() / 10);
        }

        List<Map<String, Object>> scenes = new ArrayList<>();
        for (var scene : GAME_SCENES) {
            Map<String, Object> s = new LinkedHashMap<>(scene);
            int req = (int) scene.get("requiredLevel");
            s.put("unlocked", playerLevel >= req);
            s.put("playerLevel", playerLevel);
            scenes.add(s);
        }
        return ok(Map.of("scenes", scenes, "playerLevel", playerLevel));
    }

    @PostMapping("/scene/enter")
    public ResponseEntity<Map<String, Object>> enterScene(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String sceneId = (String) body.get("sceneId");
        var scene = GAME_SCENES.stream().filter(s -> sceneId.equals(s.get("sceneId"))).findFirst();
        if (scene.isEmpty()) return err("场景不存在");
        return ok(Map.of("sceneId", sceneId, "name", scene.get().get("name"), "entered", true));
    }

    // ── 称号 ──────────────────────────────────────

    @GetMapping("/title/list")
    public ResponseEntity<Map<String, Object>> listTitles(HttpSession session) {
        long userId = requireLogin(session);
        var pt = titleService.getPlayerTitle(userId);
        List<Map<String, Object>> owned = pt.getOwnedTitleIds().stream().map(id -> {
            var t = titleService.getTemplate(id);
            return titleToMap(t, id.equals(pt.getEquippedTitleId()));
        }).toList();
        return ok(Map.of("titles", owned, "equippedId", pt.getEquippedTitleId() != null ? pt.getEquippedTitleId() : ""));
    }

    @GetMapping("/title/available")
    public ResponseEntity<Map<String, Object>> listAvailableTitles(HttpSession session) {
        requireLogin(session);
        List<Map<String, Object>> all = titleService.getAllTemplates().stream()
                .map(t -> titleToMap(t, false)).toList();
        return ok(Map.of("titles", all));
    }

    @PostMapping("/title/equip")
    public ResponseEntity<Map<String, Object>> equipTitle(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String titleId = (String) body.get("titleId");
        boolean success = titleService.equipTitle(userId, titleId);
        return ok(Map.of("success", success));
    }

    @PostMapping("/title/unequip")
    public ResponseEntity<Map<String, Object>> unequipTitle(HttpSession session) {
        long userId = requireLogin(session);
        titleService.unequipTitle(userId);
        return ok(Map.of("success", true));
    }

    @PostMapping("/title/grant")
    public ResponseEntity<Map<String, Object>> grantTitle(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String titleId = (String) body.get("titleId");
        titleService.grantTitle(userId, titleId);
        return ok(Map.of("success", true));
    }

    private Map<String, Object> titleToMap(com.iohao.mmo.title.entity.TitleTemplate t, boolean equipped) {
        if (t == null) return Map.of();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("titleId", t.getId());
        m.put("name", t.getName());
        m.put("titleType", t.getTitleType());
        m.put("requiredLevel", t.getRequiredLevel());
        m.put("description", t.getDescription());
        m.put("equipped", equipped);
        m.put("bonus", Map.of(
            "atk", t.getBonusAtk(), "def", t.getBonusDef(), "hp", t.getBonusHp(),
            "magicAtk", t.getBonusMagicAtk(), "extraAtk", t.getBonusExtraAtk(),
            "extraDef", t.getBonusExtraDef(), "agility", t.getBonusAgility()
        ));
        return m;
    }

    // ── 盟会 ──────────────────────────────────────

    @GetMapping("/guild/my")
    public ResponseEntity<Map<String, Object>> getMyGuild(HttpSession session) {
        long userId = requireLogin(session);
        var guild = guildService.getGuildByPlayer(userId);
        if (guild == null) return ok(Map.of("hasGuild", false));
        Map<String, Object> m = guildToMap(guild);
        m.put("hasGuild", true);
        var member = guild.getMember(userId);
        if (member != null) {
            m.put("myPosition", member.getPosition());
            m.put("myContribution", member.getContribution());
            m.put("myConstruction", member.getConstruction());
            m.put("myHonor", member.getHonor());
        }
        return ok(m);
    }

    @GetMapping("/guild/list")
    public ResponseEntity<Map<String, Object>> listGuilds(HttpSession session) {
        requireLogin(session);
        List<Map<String, Object>> guilds = guildService.listGuilds().stream()
                .map(this::guildToMap).toList();
        return ok(Map.of("guilds", guilds));
    }

    @GetMapping("/guild/members")
    public ResponseEntity<Map<String, Object>> listGuildMembers(HttpSession session) {
        long userId = requireLogin(session);
        var guild = guildService.getGuildByPlayer(userId);
        if (guild == null) return ok(Map.of("members", List.of()));
        List<Map<String, Object>> members = guild.getMembers().stream().map(gm -> {
            Map<String, Object> mm = new LinkedHashMap<>();
            mm.put("playerId", gm.getPlayerId());
            mm.put("playerName", gm.getPlayerName());
            mm.put("position", gm.getPosition());
            mm.put("contribution", gm.getContribution());
            mm.put("construction", gm.getConstruction());
            mm.put("honor", gm.getHonor());
            mm.put("joinTime", gm.getJoinTime());
            return mm;
        }).toList();
        return ok(Map.of("members", members));
    }

    @PostMapping("/guild/create")
    public ResponseEntity<Map<String, Object>> createGuild(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String guildName = (String) body.get("name");
        if (guildName == null || guildName.isBlank()) return err("盟会名不能为空");
        if (guildService.getGuildByPlayer(userId) != null) return err("你已加入盟会");
        Person person = personService.getPersonById(userId);
        String playerName = person != null ? person.getName() : "玩家" + userId;
        var guild = guildService.createGuild(userId, playerName, guildName);
        return ok(Map.of("success", true, "guildId", guild.getId()));
    }

    @PostMapping("/guild/join")
    public ResponseEntity<Map<String, Object>> joinGuild(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String guildId = (String) body.get("guildId");
        Person person = personService.getPersonById(userId);
        String playerName = person != null ? person.getName() : "玩家" + userId;
        boolean success = guildService.joinGuild(guildId, userId, playerName);
        return ok(Map.of("success", success));
    }

    @PostMapping("/guild/leave")
    public ResponseEntity<Map<String, Object>> leaveGuild(HttpSession session) {
        long userId = requireLogin(session);
        boolean success = guildService.leaveGuild(userId);
        return ok(Map.of("success", success));
    }

    @PostMapping("/guild/dissolve")
    public ResponseEntity<Map<String, Object>> dissolveGuild(HttpSession session) {
        long userId = requireLogin(session);
        boolean success = guildService.dissolveGuild(userId);
        return ok(Map.of("success", success));
    }

    @PostMapping("/guild/kick")
    public ResponseEntity<Map<String, Object>> kickMember(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        long targetId = ((Number) body.get("targetId")).longValue();
        boolean success = guildService.kickMember(userId, targetId);
        return ok(Map.of("success", success));
    }

    @PostMapping("/guild/donate-gold")
    public ResponseEntity<Map<String, Object>> donateGold(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        long amount = ((Number) body.get("amount")).longValue();
        guildService.donateGold(userId, amount);
        return ok(Map.of("success", true));
    }

    @PostMapping("/guild/donate-material")
    public ResponseEntity<Map<String, Object>> donateMaterial(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        long value = ((Number) body.get("value")).longValue();
        guildService.donateMaterial(userId, value);
        return ok(Map.of("success", true));
    }

    @PostMapping("/guild/set-position")
    public ResponseEntity<Map<String, Object>> setGuildPosition(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        long targetId = ((Number) body.get("targetId")).longValue();
        String position = (String) body.get("position");
        boolean success = guildService.setPosition(userId, targetId, position);
        return ok(Map.of("success", success));
    }

    private Map<String, Object> guildToMap(com.iohao.mmo.guild.entity.Guild g) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("guildId", g.getId());
        m.put("name", g.getName());
        m.put("leaderId", g.getLeaderId());
        m.put("leaderName", g.getLeaderName());
        m.put("memberCount", g.getMembers().size());
        m.put("maxMembers", g.getMaxMembers());
        m.put("level", g.getLevel());
        m.put("notice", g.getNotice());
        m.put("totalConstruction", g.getTotalConstruction());
        m.put("totalHonor", g.getTotalHonor());
        m.put("createTime", g.getCreateTime());
        return m;
    }

    private CopyOnWriteArrayList<Map<String, Object>> createDefaultFriends(long userId) {
        CopyOnWriteArrayList<Map<String, Object>> list = new CopyOnWriteArrayList<>();
        list.add(createFriendProfile(10001L, "云中仙", "刚刚在线", "常驻婚介代练区，爱聊副本和拍卖行情。"));
        list.add(createFriendProfile(10002L, "梦里人", "1小时前", "最近在拍卖行扫货，偶尔一起打世界 Boss。"));
        return list;
    }

    private Map<String, Object> createFriendProfile(long playerId, String name, String lastSeen, String intro) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("playerId", playerId);
        item.put("name", name);
        item.put("level", 30 + (int) (playerId % 20));
        item.put("lastSeen", lastSeen);
        item.put("zoneId", "main_city");
        item.put("intro", intro);
        item.put("relation", "friend");
        return item;
    }

    private CopyOnWriteArrayList<Map<String, Object>> createDefaultMails(long userId) {
        CopyOnWriteArrayList<Map<String, Object>> mails = new CopyOnWriteArrayList<>();
        mails.add(createMail("mail_welcome_" + userId, "开服贺礼", "欢迎来到气盖山河区，以下是你的开服物资。", "系统", "绑定元宝 * 188", false));
        mails.add(createMail("mail_boss_" + userId, "世界 Boss 集结", "今晚 21:00 世界 Boss 开启，请准时到猎场宝山集合。", "活动使者", null, true));
        mails.add(createMail("mail_tax_" + userId, "拍卖结算", "你有一笔拍卖收入已到账，请查收。", "拍卖行", "金币 * 12000", false));
        return mails;
    }

    private Map<String, Object> createMail(String id, String title, String content, String senderName, String reward, boolean read) {
        Map<String, Object> mail = new LinkedHashMap<>();
        mail.put("id", id);
        mail.put("title", title);
        mail.put("content", content);
        mail.put("senderName", senderName);
        mail.put("createdAt", System.currentTimeMillis() - new Random().nextInt(7200_000));
        mail.put("read", read);
        mail.put("reward", reward);
        mail.put("rewardClaimed", false);
        return mail;
    }

    private Map<String, Object> dialogueToMap(String sessionId, DialogueMessage msg) {
        Map<String, Object> m = new HashMap<>();
        if (msg == null) return m;
        m.put("sessionId", sessionId);
        m.put("speaker", msg.speaker);
        m.put("emotion", msg.emotion);
        m.put("text", msg.text);
        m.put("fateDelta", msg.fateDelta);
        m.put("trustDelta", msg.trustDelta);
        m.put("allowFreeInput", msg.allowFreeInput);
        m.put("choicesJson", msg.choicesJson);
        if (msg.sceneHint != null && !msg.sceneHint.isBlank()) {
            m.put("sceneHint", msg.sceneHint);
        }
        return m;
    }

    // ── 宝山 ──────────────────────────────────────

    @GetMapping("/treasure/list")
    public ResponseEntity<Map<String, Object>> listMountains(HttpSession session) {
        requireLogin(session);
        return ok(Map.of("mountains", treasureMountainService.listMountains()));
    }

    @GetMapping("/treasure/status")
    public ResponseEntity<Map<String, Object>> getMountainStatus(
            @RequestParam String mountainType, HttpSession session) {
        long userId = requireLogin(session);
        var session2 = treasureMountainService.getSessionToday(userId, mountainType);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("mountainType", session2.getMountainType());
        m.put("digCount", session2.getDigCount());
        m.put("totalReward", session2.getTotalReward());
        m.put("dateTag", session2.getDateTag());
        return ok(m);
    }

    @PostMapping("/treasure/dig")
    public ResponseEntity<Map<String, Object>> digMountain(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String mountainType = (String) body.get("mountainType");
        var guild = guildService.getGuildByPlayer(userId);
        if (guild == null) return err("需加入盟会才能挖掘宝山");
        var result = treasureMountainService.dig(userId, guild.getId(), mountainType);
        if (!(boolean) result.get("success")) return err((String) result.get("message"));
        return ok(result);
    }

    // ── 全局缘值/信值 ──────────────────────────────────────

    @GetMapping("/fate/global")
    public ResponseEntity<Map<String, Object>> getGlobalFate(HttpSession session) {
        long userId = requireLogin(session);
        var gf = fateService.getGlobalFate(userId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalFate", gf.getTotalFate());
        m.put("totalTrust", gf.getTotalTrust());
        m.put("currentFate", gf.getCurrentFate());
        m.put("currentTrust", gf.getCurrentTrust());
        m.put("fateGrade", gf.getFateGrade());
        m.put("worldIndex", gf.getWorldFateHistory() != null ? gf.getWorldFateHistory().size() + 1 : 1);
        return ok(m);
    }

    // ── 情花系统 ──────────────────────────────────────

    @GetMapping("/flower/get")
    public ResponseEntity<Map<String, Object>> getFlower(HttpSession session) {
        long userId = requireLogin(session);
        var flower = flowerService.getOrCreate(userId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("playerId", flower.getPlayerId());
        m.put("flowerName", flower.getFlowerName());
        m.put("stage", flower.getStage());
        m.put("color", flower.getColor());
        m.put("totalFateWatered", flower.getTotalFateWatered());
        m.put("totalTrustInfused", flower.getTotalTrustInfused());
        m.put("flowerVerse", flower.getFlowerVerse() != null ? flower.getFlowerVerse() : "");
        m.put("worldCount", flower.getWorldCount());
        m.put("bloomed", flower.isBloomed());
        return ok(m);
    }

    @PostMapping("/flower/water")
    public ResponseEntity<Map<String, Object>> waterFlower(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        int fateAmount = ((Number) body.getOrDefault("fateAmount", 0)).intValue();
        int trustAmount = ((Number) body.getOrDefault("trustAmount", 0)).intValue();

        // 消耗全局缘值和信值
        if (!fateService.consumeFate(userId, fateAmount)) return err("缘值不足");
        if (trustAmount > 0 && !fateService.consumeTrust(userId, trustAmount)) return err("信值不足");

        var flower = flowerService.water(userId, fateAmount, trustAmount);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("playerId", flower.getPlayerId());
        m.put("flowerName", flower.getFlowerName());
        m.put("stage", flower.getStage());
        m.put("color", flower.getColor());
        m.put("totalFateWatered", flower.getTotalFateWatered());
        m.put("totalTrustInfused", flower.getTotalTrustInfused());
        m.put("flowerVerse", flower.getFlowerVerse() != null ? flower.getFlowerVerse() : "");
        m.put("worldCount", flower.getWorldCount());
        m.put("bloomed", flower.isBloomed());
        return ok(m);
    }

    // ── 玩家交易 ──────────────────────────────────────

    @GetMapping("/trade/list")
    public ResponseEntity<Map<String, Object>> listTrades(HttpSession session) {
        requireLogin(session);
        var trades = tradeService.listOpenTrades();
        List<Map<String, Object>> list = trades.stream().map(this::tradeToMap).toList();
        return ok(Map.of("trades", list));
    }

    @PostMapping("/trade/create")
    public ResponseEntity<Map<String, Object>> createTrade(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String itemId = (String) body.get("itemId");
        int quantity = ((Number) body.getOrDefault("quantity", 1)).intValue();
        int price = ((Number) body.getOrDefault("price", 0)).intValue();
        String currency = (String) body.getOrDefault("currency", "gold");

        // 获取物品名称
        String itemName = itemId;
        var order = tradeService.createTrade(userId, "", itemId, itemName, quantity, price, currency);
        return ok(tradeToMap(order));
    }

    @PostMapping("/trade/accept")
    public ResponseEntity<Map<String, Object>> acceptTrade(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String tradeId = (String) body.get("tradeId");
        var order = tradeService.acceptTrade(tradeId, userId);
        if (order == null) return err("交易失败");

        // 交易产生缘值奖励
        fateService.addGlobalFate(userId, order.getFateReward(), 0);
        fateService.addGlobalFate(order.getSellerId(), order.getFateReward(), 0);

        return ok(tradeToMap(order));
    }

    @PostMapping("/trade/cancel")
    public ResponseEntity<Map<String, Object>> cancelTrade(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String tradeId = (String) body.get("tradeId");
        var order = tradeService.cancelTrade(tradeId, userId);
        if (order == null) return err("取消失败");
        return ok(tradeToMap(order));
    }

    @GetMapping("/trade/my")
    public ResponseEntity<Map<String, Object>> getMyTrades(HttpSession session) {
        long userId = requireLogin(session);
        var trades = tradeService.getMyTrades(userId);
        List<Map<String, Object>> list = trades.stream().map(this::tradeToMap).toList();
        return ok(Map.of("trades", list));
    }

    private Map<String, Object> tradeToMap(com.iohao.mmo.trade.entity.TradeOrder o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tradeId", o.getId());
        m.put("sellerId", o.getSellerId());
        m.put("sellerName", o.getSellerName() != null ? o.getSellerName() : "");
        m.put("itemId", o.getItemId());
        m.put("itemName", o.getItemName() != null ? o.getItemName() : "");
        m.put("quantity", o.getQuantity());
        m.put("price", o.getPrice());
        m.put("currency", o.getCurrency());
        m.put("createTime", o.getCreateTime());
        m.put("status", o.getStatus());
        return m;
    }

    // ── 组队PvP ──────────────────────────────────────

    @PostMapping("/team-battle/create")
    public ResponseEntity<Map<String, Object>> createTeam(HttpSession session) {
        long userId = requireLogin(session);
        var team = teamBattleService.createTeam(userId, "");
        return ok(teamToMap(team));
    }

    @PostMapping("/team-battle/join")
    public ResponseEntity<Map<String, Object>> joinTeam(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String teamId = (String) body.get("teamId");
        var team = teamBattleService.joinTeam(teamId, userId, "");
        if (team == null) return err("加入失败");
        return ok(teamToMap(team));
    }

    @PostMapping("/team-battle/leave")
    public ResponseEntity<Map<String, Object>> leaveTeam(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String teamId = (String) body.get("teamId");
        var team = teamBattleService.leaveTeam(teamId, userId);
        if (team == null) return err("离开失败");
        return ok(teamToMap(team));
    }

    @GetMapping("/team-battle/info")
    public ResponseEntity<Map<String, Object>> getTeamInfo(@RequestParam String teamId, HttpSession session) {
        requireLogin(session);
        var team = teamBattleService.getTeam(teamId);
        if (team == null) return err("队伍不存在");
        return ok(teamToMap(team));
    }

    private Map<String, Object> teamToMap(com.iohao.mmo.teambattle.entity.Team t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("teamId", t.getId());
        m.put("leaderId", t.getLeaderId());
        m.put("leaderName", t.getLeaderName() != null ? t.getLeaderName() : "");
        m.put("memberIds", t.getMemberIds() != null ? JSON.toJSONString(t.getMemberIds()) : "[]");
        m.put("memberNames", t.getMemberNames() != null ? JSON.toJSONString(t.getMemberNames()) : "[]");
        m.put("teamSize", t.getTeamSize());
        m.put("status", t.getStatus());
        m.put("totalPower", t.getTotalPower());
        return m;
    }

    // ── 记忆激活 ──────────────────────────────────────

    @PostMapping("/memory/activate")
    public ResponseEntity<Map<String, Object>> activateMemory(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String fragmentId = (String) body.get("fragmentId");

        // 获取碎片检查激活成本
        var fragOpt = memoryService.getMemory(fragmentId);
        if (fragOpt.isEmpty()) return err("记忆碎片不存在");
        var frag = fragOpt.get();
        if (frag.isActivated()) return err("已激活");
        if (frag.isLocked()) return err("记忆尚未解锁");

        // 消耗缘值激活
        if (!fateService.consumeFate(userId, frag.getActivateFateCost())) return err("缘值不足");

        var activated = memoryService.activateMemory(fragmentId);
        if (activated == null) return err("激活失败");

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fragmentId", activated.getId());
        m.put("title", activated.getTitle());
        m.put("activated", true);
        m.put("bonusType", activated.getBonusType());
        m.put("bonusValue", activated.getBonusValue());
        return ok(m);
    }

    @GetMapping("/memory/bonuses")
    public ResponseEntity<Map<String, Object>> getActivatedBonuses(HttpSession session) {
        long userId = requireLogin(session);
        var bonuses = memoryService.getActivatedBonuses(userId);
        return ok(Map.of("bonuses", bonuses));
    }

    // ── 共探书境 ──────────────────────────────────────

    @PostMapping("/coexplore/create")
    public ResponseEntity<Map<String, Object>> createCoexplore(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String name = (String) session.getAttribute("username");
        String bookTitle = body != null ? (String) body.get("bookTitle") : null;
        String bookLoreSummary = body != null ? (String) body.get("bookLoreSummary") : null;
        String bookArtStyle = body != null ? (String) body.get("bookArtStyle") : null;
        if (bookTitle == null || bookTitle.isBlank()) return err("请先选择一本书");
        var s = coexploreService.createSession(userId, name != null ? name : "",
                bookTitle, bookLoreSummary, bookArtStyle);
        broadcastCoexploreLobby();
        return ok(coexploreToMap(s, userId));
    }

    @PostMapping("/coexplore/join")
    public ResponseEntity<Map<String, Object>> joinCoexplore(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String sessionId = (String) body.get("sessionId");
        String name = (String) session.getAttribute("username");
        var s = coexploreService.joinSession(sessionId, userId, name != null ? name : "");
        if (s == null) return err("加入失败，房间不存在或已满");
        broadcastCoexplore(s);
        broadcastCoexploreLobby();
        // 异步生成谜局场景图和地点图
        sseExecutor.submit(() -> generateCoexploreImages(s.getId()));
        return ok(coexploreToMap(s, userId));
    }

    @GetMapping("/coexplore/session")
    public ResponseEntity<Map<String, Object>> getCoexplore(@RequestParam String sessionId, HttpSession session) {
        long userId = requireLogin(session);
        var s = coexploreService.getSession(sessionId);
        if (s == null) return err("会话不存在");
        return ok(coexploreToMap(s, userId));
    }

    @GetMapping("/coexplore/list")
    public ResponseEntity<Map<String, Object>> listCoexplore(HttpSession session) {
        long userId = requireLogin(session);
        var list = coexploreService.listWaiting();
        List<Map<String, Object>> result = list.stream().map(x -> coexploreToMap(x, userId)).toList();
        return ok(Map.of("sessions", result));
    }

    @PostMapping("/coexplore/explore")
    public ResponseEntity<Map<String, Object>> coexploreExplore(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String sessionId = (String) body.get("sessionId");
        String locationId = (String) body.get("locationId");
        var s = coexploreService.explore(sessionId, userId, locationId);
        if (s == null) return err("操作失败");
        broadcastCoexplore(s);
        return ok(coexploreToMap(s, userId));
    }

    @PostMapping("/coexplore/reason")
    public ResponseEntity<Map<String, Object>> coexploreReason(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String sessionId = (String) body.get("sessionId");
        int answerIndex = ((Number) body.get("answerIndex")).intValue();
        var s = coexploreService.reason(sessionId, userId, answerIndex);
        if (s == null) return err("推理失败");
        broadcastCoexplore(s);
        return ok(coexploreToMap(s, userId));
    }

    @PostMapping("/coexplore/boss")
    public ResponseEntity<Map<String, Object>> coexploreBoss(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String sessionId = (String) body.get("sessionId");
        var s = coexploreService.bossBattle(sessionId, userId);
        if (s == null) return err("战斗失败");
        broadcastCoexplore(s);
        return ok(coexploreToMap(s, userId));
    }

    @PostMapping("/coexplore/leave")
    public ResponseEntity<Map<String, Object>> leaveCoexplore(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String sessionId = (String) body.get("sessionId");
        var s = coexploreService.leaveSession(sessionId, userId);
        if (s == null) return err("离开失败");
        broadcastCoexplore(s);
        broadcastCoexploreLobby();
        return ok(coexploreToMap(s, userId));
    }

    @GetMapping(value = "/coexplore/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeCoexplore(@RequestParam String sessionId, HttpSession session) {
        long userId = requireLogin(session);
        SseEmitter emitter = new SseEmitter(300_000L); // 5 分钟超时

        var sessionEmitters = coexploreEmitters.computeIfAbsent(sessionId, k -> new ConcurrentHashMap<>());
        sessionEmitters.put(userId, emitter);

        Runnable cleanup = () -> {
            var map = coexploreEmitters.get(sessionId);
            if (map != null) {
                map.remove(userId);
                if (map.isEmpty()) coexploreEmitters.remove(sessionId);
            }
        };
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        // 立即推送当前状态
        sseExecutor.submit(() -> {
            try {
                var s = coexploreService.getSession(sessionId);
                if (s != null) {
                    emitter.send(SseEmitter.event().name("update").data(JSON.toJSONString(coexploreToMap(s, userId))));
                }
            } catch (Exception ignored) {}
        });

        return emitter;
    }

    /** 向同一 session 的所有 SSE 订阅者推送最新状态 */
    private void broadcastCoexplore(CoexploreSession s) {
        if (s == null) return;
        var sessionEmitters = coexploreEmitters.get(s.getId());
        if (sessionEmitters == null) return;
        sessionEmitters.forEach((uid, emitter) -> {
            try {
                emitter.send(SseEmitter.event().name("update").data(JSON.toJSONString(coexploreToMap(s, uid))));
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        // 会话结束时清理
        if ("COMPLETED".equals(s.getStatus())) {
            sessionEmitters.forEach((uid, emitter) -> {
                try { emitter.complete(); } catch (Exception ignored) {}
            });
            coexploreEmitters.remove(s.getId());
        }
    }

    @GetMapping(value = "/coexplore/subscribe-lobby", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeCoexploreLobby(HttpSession session) {
        long userId = requireLogin(session);
        SseEmitter emitter = new SseEmitter(300_000L);

        coexploreLobbyEmitters.put(userId, emitter);
        Runnable cleanup = () -> coexploreLobbyEmitters.remove(userId);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        // 立即推送当前等待列表
        sseExecutor.submit(() -> {
            try {
                var list = coexploreService.listWaiting();
                var result = list.stream().map(x -> coexploreToMap(x, userId)).toList();
                emitter.send(SseEmitter.event().name("lobby").data(JSON.toJSONString(Map.of("sessions", result))));
            } catch (Exception ignored) {}
        });

        return emitter;
    }

    /** 向所有大厅 SSE 订阅者推送最新等待列表 */
    private void broadcastCoexploreLobby() {
        if (coexploreLobbyEmitters.isEmpty()) return;
        var list = coexploreService.listWaiting();
        coexploreLobbyEmitters.forEach((uid, emitter) -> {
            try {
                var result = list.stream().map(x -> coexploreToMap(x, uid)).toList();
                emitter.send(SseEmitter.event().name("lobby").data(JSON.toJSONString(Map.of("sessions", result))));
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
    }

    /** 异步生成共探谜局的所有场景图，完成后通过 SSE 推送 */
    private void generateCoexploreImages(String sessionId) {
        try {
            var session = coexploreService.getSession(sessionId);
            if (session == null) return;

            String bg = session.getMysteryBackground() != null ? session.getMysteryBackground() : "";
            String artStyle = session.getBookArtStyle() != null && !session.getBookArtStyle().isBlank()
                    ? session.getBookArtStyle() : "古风悬疑";
            String bookTitle = session.getBookTitle() != null ? session.getBookTitle() : "";
            String styleTag = artStyle + "场景插画，" + (bookTitle.isBlank() ? "" : "「" + bookTitle + "」世界观，");

            // 1. 谜局主场景图
            String mysteryPrompt = styleTag + bg
                    + "，暗色调，氛围神秘，全景构图，无人物，无文字，无水印";
            sceneImageService.getOrGenerate("coex_mystery_" + sessionId, mysteryPrompt)
                    .ifPresent(img -> {
                        session.setMysteryImageId(img.getId());
                        coexploreService.saveSession(session);
                        broadcastCoexplore(session);
                    });

            // 2. 所有地点图（并行生成）
            List<java.util.concurrent.CompletableFuture<Void>> futures = new ArrayList<>();
            for (var locs : List.of(session.getRound1Locations(), session.getRound2Locations())) {
                if (locs == null) continue;
                for (var loc : locs) {
                    futures.add(java.util.concurrent.CompletableFuture.runAsync(() -> {
                        String prompt = styleTag + loc.getName() + "，" + loc.getDescription()
                                + "，暗色调，氛围感，全景构图，无人物，无文字，无水印";
                        sceneImageService.getOrGenerate("coex_loc_" + sessionId + "_" + loc.getId(), prompt)
                                .ifPresent(img -> loc.setImageId(img.getId()));
                    }, sseExecutor));
                }
            }
            java.util.concurrent.CompletableFuture.allOf(futures.toArray(new java.util.concurrent.CompletableFuture[0]))
                    .get(300, java.util.concurrent.TimeUnit.SECONDS);

            coexploreService.saveSession(session);
            broadcastCoexplore(session);
        } catch (Exception e) {
            log.warn("共探图片生成失败: sessionId={}, error={}", sessionId, e.getMessage());
        }
    }

    /**
     * 会话序列化 — 根据请求者身份过滤敏感数据
     * <p>
     * 规则：
     * - correctAnswer 仅 COMPLETED 时返回
     * - 当前轮中未完成双选时，只返回自己的线索
     * - 已完成轮次的线索双方都可见
     */
    private Map<String, Object> coexploreToMap(CoexploreSession s, long viewerId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sessionId", s.getId());
        m.put("hostId", s.getHostId());
        m.put("hostName", s.getHostName() != null ? s.getHostName() : "");
        m.put("guestId", s.getGuestId());
        m.put("guestName", s.getGuestName() != null ? s.getGuestName() : "");
        m.put("status", s.getStatus());
        m.put("currentRound", s.getCurrentRound());
        m.put("bookTitle", s.getBookTitle());
        m.put("hostFateValue", s.getHostFateValue());
        m.put("guestFateValue", s.getGuestFateValue());
        m.put("bossHp", s.getBossHp());
        m.put("bossDamageHost", s.getBossDamageHost());
        m.put("bossDamageGuest", s.getBossDamageGuest());

        // 谜局信息
        m.put("mysteryBackground", s.getMysteryBackground());
        m.put("mysteryImageUrl", s.getMysteryImageId() != null ? "/api/story/scene-image/" + s.getMysteryImageId() : null);
        m.put("suspects", s.getSuspects());
        // correctAnswer 仅结算后可见
        m.put("correctAnswer", "COMPLETED".equals(s.getStatus()) ? s.getCorrectAnswer() : -1);

        // 推理答案
        m.put("hostAnswer", s.getHostAnswer());
        m.put("guestAnswer", s.getGuestAnswer());
        m.put("reasoningResult", s.getReasoningResult());

        // 当前轮地点（不含线索文本，线索通过轮次记录获取）
        boolean isHost = viewerId == s.getHostId();
        List<Map<String, Object>> locs = new ArrayList<>();
        var locList = s.getCurrentRound() <= 1 ? s.getRound1Locations() : s.getRound2Locations();
        if (locList != null) {
            for (var loc : locList) {
                Map<String, Object> lm = new LinkedHashMap<>();
                lm.put("id", loc.getId());
                lm.put("name", loc.getName());
                lm.put("description", loc.getDescription());
                lm.put("imageUrl", loc.getImageId() != null ? "/api/story/scene-image/" + loc.getImageId() : null);
                locs.add(lm);
            }
        }
        m.put("locations", locs);

        // 轮次记录
        List<Map<String, Object>> rounds = new ArrayList<>();
        if (s.getRounds() != null) {
            for (var r : s.getRounds()) {
                Map<String, Object> rm = new LinkedHashMap<>();
                rm.put("round", r.getRound());
                rm.put("hostLocationId", r.getHostLocationId());
                rm.put("guestLocationId", r.getGuestLocationId());
                rm.put("hostFateGain", r.getHostFateGain());
                rm.put("guestFateGain", r.getGuestFateGain());
                rm.put("sameLocation", r.isSameLocation());

                // 线索可见性：双方都选完后所有线索可见；否则只能看自己的
                boolean roundComplete = r.getHostLocationId() != null && r.getGuestLocationId() != null;
                if (roundComplete) {
                    rm.put("hostClue", r.getHostClue());
                    rm.put("guestClue", r.getGuestClue());
                    rm.put("hostTrace", r.getHostTrace());
                    rm.put("guestTrace", r.getGuestTrace());
                } else {
                    rm.put("hostClue", isHost ? r.getHostClue() : null);
                    rm.put("guestClue", isHost ? null : r.getGuestClue());
                    // 痕迹：对方选过的地点痕迹可见
                    rm.put("hostTrace", !isHost && r.getHostTrace() != null ? r.getHostTrace() : null);
                    rm.put("guestTrace", isHost && r.getGuestTrace() != null ? r.getGuestTrace() : null);
                }
                rounds.add(rm);
            }
        }
        m.put("rounds", rounds);
        return m;
    }

    // ── 天命之轮（转盘）──────────────────────────────────

    @GetMapping("/wheel/info")
    public ResponseEntity<Map<String, Object>> wheelInfo(HttpSession session) {
        requireLogin(session);
        // 获取或创建默认转盘
        LuckyWheelEvent wheel = getOrCreateDefaultWheel();
        List<Map<String, Object>> prizes = new ArrayList<>();
        if (wheel.getPrizes() != null) {
            for (int i = 0; i < wheel.getPrizes().size(); i++) {
                LuckyWheelEvent.WheelPrize p = wheel.getPrizes().get(i);
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("id", p.getPrizeId());
                pm.put("name", p.getPrizeName());
                pm.put("icon", qualityToIcon(p.getQuality(), p.getPrizeType()));
                pm.put("rare", p.isJackpot());
                prizes.add(pm);
            }
        }
        return ok(Map.of(
            "prizes", prizes,
            "freeSpins", wheel.getDailyFreeSpin(),
            "spinCost", wheel.getCostPerSpin(),
            "history", List.of()
        ));
    }

    @PostMapping("/wheel/spin")
    public ResponseEntity<Map<String, Object>> wheelSpin(HttpSession session) {
        long userId = requireLogin(session);
        LuckyWheelEvent wheel = getOrCreateDefaultWheel();
        LuckyWheelEventService.SpinResult result = luckyWheelEventService.spin(wheel.getId(), userId, true);
        if (!result.isSuccess()) {
            // 免费次数用完，尝试付费
            result = luckyWheelEventService.spin(wheel.getId(), userId, false);
        }
        LuckyWheelEvent.WheelPrize prize = result.getPrize();
        int prizeIndex = 0;
        if (prize != null && wheel.getPrizes() != null) {
            for (int i = 0; i < wheel.getPrizes().size(); i++) {
                if (wheel.getPrizes().get(i).getPrizeId().equals(prize.getPrizeId())) {
                    prizeIndex = i;
                    break;
                }
            }
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("prizeIndex", prizeIndex);
        data.put("rewardName", prize != null ? prize.getPrizeName() : "神秘奖品");
        data.put("rewardIcon", prize != null ? qualityToIcon(prize.getQuality(), prize.getPrizeType()) : "🎁");
        data.put("rewardDesc", result.getMessage());
        data.put("remainingFreeSpins", 0);
        return ok(data);
    }

    private String qualityToIcon(String quality, LuckyWheelEvent.PrizeType type) {
        if (type == LuckyWheelEvent.PrizeType.GOLD) return "💰";
        if (type == LuckyWheelEvent.PrizeType.DIAMOND) return "💎";
        if (type == LuckyWheelEvent.PrizeType.EXP) return "✨";
        if (type == LuckyWheelEvent.PrizeType.PET) return "🐉";
        if (type == LuckyWheelEvent.PrizeType.TITLE) return "👑";
        if ("mythic".equals(quality)) return "🌟";
        if ("legendary".equals(quality)) return "⚔️";
        if ("epic".equals(quality)) return "📜";
        return "🎁";
    }

    private LuckyWheelEvent getOrCreateDefaultWheel() {
        // 尝试获取已有转盘，没有则创建
        try {
            var wheels = mongoTemplate.findAll(LuckyWheelEvent.class);
            if (!wheels.isEmpty()) return wheels.get(0);
        } catch (Exception ignored) {}
        return luckyWheelEventService.createLuckyWheel("lucky_wheel", "天命之轮");
    }

    // ── 世界BOSS ──────────────────────────────────────

    @GetMapping("/world-boss/info")
    public ResponseEntity<Map<String, Object>> worldBossInfo(HttpSession session) {
        requireLogin(session);
        List<WorldBossEvent> bosses = worldBossEventService.getActiveBosses();
        WorldBossEvent boss;
        if (bosses.isEmpty()) {
            boss = worldBossEventService.createWorldBoss("world_boss", "混沌魔神·烛龙", 99, 10000000L);
        } else {
            boss = bosses.get(0);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("bossId", boss.getId());
        data.put("name", boss.getBossName());
        data.put("level", boss.getBossLevel());
        data.put("currentHp", boss.getCurrentHp());
        data.put("totalHp", boss.getTotalHp());
        data.put("status", boss.getStatus().name().toLowerCase());
        data.put("skills", boss.getSkills());
        data.put("participantCount", boss.getDamageRecords() != null ? boss.getDamageRecords().size() : 0);
        return ok(data);
    }

    @PostMapping("/world-boss/attack")
    public ResponseEntity<Map<String, Object>> worldBossAttack(HttpSession session) {
        long userId = requireLogin(session);
        List<WorldBossEvent> bosses = worldBossEventService.getActiveBosses();
        if (bosses.isEmpty()) return err("当前没有活跃的世界BOSS");
        WorldBossEvent boss = bosses.get(0);
        String userName = (String) session.getAttribute("username");
        long damage = (long) (Math.random() * 5000 + 1000);
        WorldBossEventService.AttackResult result = worldBossEventService.attackBoss(boss.getId(), userId, userName, damage);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("damage", damage);
        data.put("cooldownSeconds", 5);
        if (result.isKilled()) data.put("reward", "传说装备碎片 x1");
        return ok(data);
    }

    @GetMapping("/world-boss/rank")
    public ResponseEntity<Map<String, Object>> worldBossRank(HttpSession session) {
        requireLogin(session);
        List<WorldBossEvent> bosses = worldBossEventService.getActiveBosses();
        List<Map<String, Object>> entries = new ArrayList<>();
        if (!bosses.isEmpty()) {
            var ranking = worldBossEventService.getDamageRanking(bosses.get(0).getId(), 50);
            for (var r : ranking) {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("playerId", String.valueOf(r.getUserId()));
                e.put("playerName", r.getUserName());
                e.put("damage", r.getDamage());
                entries.add(e);
            }
        }
        return ok(Map.of("entries", entries));
    }

    // ── 太古秘典（技能书抽取）──────────────────────────────

    @GetMapping("/mystic-tome/pool")
    public ResponseEntity<Map<String, Object>> tomePool(HttpSession session) {
        requireLogin(session);
        List<Map<String, Object>> books = new ArrayList<>();
        String[][] pool = {
            {"skill_nitiangaiming", "逆天改命", "🌟", "SSR", "改写命运轨迹，无视一切防御"},
            {"skill_fentianmiedi", "焚天灭地", "🔥", "SSR", "召唤天火焚烧一切"},
            {"skill_wanjianguizong", "万剑归宗", "⚔️", "SR", "万剑齐发，剑气纵横"},
            {"skill_xuanyuanzhao", "玄元照", "✨", "SR", "照见真我，提升悟性"},
            {"skill_bingfengzhan", "冰封斩", "❄️", "R", "冰系攻击，冻结目标"},
            {"skill_leiyin", "雷引", "⚡", "R", "引雷攻击，范围伤害"},
            {"skill_tianluo", "天罗", "🕸️", "R", "束缚目标，无法行动"},
            {"skill_huifu", "灵息术", "💚", "N", "恢复少量生命"},
        };
        for (String[] b : pool) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b[0]);
            m.put("name", b[1]);
            m.put("icon", b[2]);
            m.put("rank", b[3]);
            m.put("description", b[4]);
            books.add(m);
        }
        return ok(Map.of(
            "books", books,
            "pityCount", 0,
            "pityGuarantee", 10,
            "drawOneCost", 100,
            "drawTenCost", 900
        ));
    }

    @PostMapping("/mystic-tome/draw")
    public ResponseEntity<Map<String, Object>> tomeDraw(@RequestBody Map<String, Object> body, HttpSession session) {
        requireLogin(session);
        int count = ((Number) body.getOrDefault("count", 1)).intValue();
        String[][] pool = {
            {"skill_nitiangaiming", "逆天改命", "🌟", "SSR"},
            {"skill_fentianmiedi", "焚天灭地", "🔥", "SSR"},
            {"skill_wanjianguizong", "万剑归宗", "⚔️", "SR"},
            {"skill_xuanyuanzhao", "玄元照", "✨", "SR"},
            {"skill_bingfengzhan", "冰封斩", "❄️", "R"},
            {"skill_leiyin", "雷引", "⚡", "R"},
            {"skill_tianluo", "天罗", "🕸️", "R"},
            {"skill_huifu", "灵息术", "💚", "N"},
        };
        // 概率权重: SSR=2, SR=8, R=30, N=60
        int[] weights = {1, 1, 4, 4, 15, 15, 15, 45};
        int totalWeight = 0;
        for (int w : weights) totalWeight += w;
        Random rand = new Random();
        List<Map<String, Object>> results = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            int roll = rand.nextInt(totalWeight);
            int cum = 0;
            int idx = pool.length - 1;
            for (int j = 0; j < weights.length; j++) {
                cum += weights[j];
                if (roll < cum) { idx = j; break; }
            }
            String[] b = pool[idx];
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b[0]);
            m.put("name", b[1]);
            m.put("icon", b[2]);
            m.put("rank", b[3]);
            results.add(m);
        }
        return ok(Map.of("results", results, "pityCount", 0));
    }

    // ── 鸿蒙秘境（限时探索）──────────────────────────────

    private final ConcurrentHashMap<Long, Map<String, Object>> realmSessions = new ConcurrentHashMap<>();

    @GetMapping("/secret-realm/status")
    public ResponseEntity<Map<String, Object>> realmStatus(HttpSession session) {
        long userId = requireLogin(session);
        Map<String, Object> realm = realmSessions.get(userId);
        if (realm == null) {
            return ok(Map.of(
                "realmId", "",
                "status", "idle",
                "currentFloor", 0,
                "stamina", 100,
                "maxStamina", 100,
                "endTime", 0,
                "logs", List.of()
            ));
        }
        return ok(realm);
    }

    @PostMapping("/secret-realm/enter")
    public ResponseEntity<Map<String, Object>> realmEnter(HttpSession session) {
        long userId = requireLogin(session);
        Map<String, Object> realm = new LinkedHashMap<>();
        realm.put("realmId", "realm_" + userId + "_" + System.currentTimeMillis());
        realm.put("status", "active");
        realm.put("currentFloor", 1);
        realm.put("stamina", 100);
        realm.put("maxStamina", 100);
        realm.put("endTime", System.currentTimeMillis() + 2880 * 60 * 1000L);
        realm.put("logs", new ArrayList<>(List.of("踏入鸿蒙秘境第1层...")));
        realmSessions.put(userId, realm);
        return ok(realm);
    }

    @PostMapping("/secret-realm/explore")
    public ResponseEntity<Map<String, Object>> realmExplore(HttpSession session) {
        long userId = requireLogin(session);
        Map<String, Object> realm = realmSessions.get(userId);
        if (realm == null || !"active".equals(realm.get("status"))) {
            return err("尚未进入秘境");
        }
        int stamina = ((Number) realm.get("stamina")).intValue();
        if (stamina <= 0) return err("体力不足");
        realm.put("stamina", stamina - 10);
        int floor = ((Number) realm.get("currentFloor")).intValue();

        String[][] events = {
            {"battle", "⚔️", "远古石像守卫", "石像苏醒，阻挡前路！"},
            {"treasure", "📦", "隐藏宝箱", "发现一个散发灵光的宝箱"},
            {"heal", "💚", "灵泉", "清澈灵泉涌出，恢复精力"},
            {"mystery", "🔮", "命运路口", "三条道路分叉，隐约感应到不同气息"},
        };
        Random rand = new Random();
        String[] ev = events[rand.nextInt(events.length)];
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("eventId", "evt_" + System.currentTimeMillis());
        event.put("type", ev[0]);
        event.put("icon", ev[1]);
        event.put("title", ev[2]);
        event.put("description", ev[3]);
        event.put("choices", List.of("挑战", "回避"));
        return ok(Map.of(
            "event", event,
            "stamina", stamina - 10,
            "currentFloor", floor
        ));
    }

    @PostMapping("/secret-realm/resolve")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> realmResolve(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        Map<String, Object> realm = realmSessions.get(userId);
        if (realm == null) return err("尚未进入秘境");
        int choice = ((Number) body.getOrDefault("choice", 0)).intValue();
        int floor = ((Number) realm.get("currentFloor")).intValue();
        int stamina = ((Number) realm.get("stamina")).intValue();
        boolean success = new Random().nextDouble() > 0.3;
        String resultText;
        List<Map<String, Object>> loot = new ArrayList<>();
        if (choice == 0 && success) {
            resultText = "挑战成功！获得了丰厚奖励";
            loot.add(Map.of("icon", "💎", "name", "灵石 x" + (50 + new Random().nextInt(100))));
            floor++;
            realm.put("currentFloor", floor);
        } else if (choice == 0) {
            resultText = "挑战失败，损失了一些体力";
            stamina = Math.max(0, stamina - 5);
            realm.put("stamina", stamina);
        } else {
            resultText = "选择回避，安全通过";
            floor++;
            realm.put("currentFloor", floor);
        }
        String logEntry = "第" + floor + "层: " + resultText;
        ((List<String>) realm.get("logs")).add(logEntry);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("success", success || choice == 1);
        data.put("resultText", resultText);
        if (!loot.isEmpty()) data.put("loot", loot);
        data.put("logEntry", logEntry);
        data.put("stamina", stamina);
        data.put("currentFloor", floor);
        return ok(data);
    }

    // ── 区域 (Zone) ────────────────────────────────────

    @GetMapping("/zone/current")
    public ResponseEntity<Map<String, Object>> getCurrentZone(HttpSession session) {
        long userId = requireLogin(session);
        var info = zoneService.getZoneInfo(userId);
        return ok(zoneInfoToMap(info));
    }

    @PostMapping("/zone/move")
    public ResponseEntity<Map<String, Object>> moveToZone(@RequestBody Map<String, String> body, HttpSession session) {
        long userId = requireLogin(session);
        String targetZoneId = body.get("zoneId");
        var info = zoneService.moveToZone(userId, targetZoneId);
        if (info == null) return err("无法移动到目标区域");
        return ok(zoneInfoToMap(info));
    }

    @GetMapping("/zone/nearby-players")
    public ResponseEntity<Map<String, Object>> getNearbyPlayers(HttpSession session) {
        long userId = requireLogin(session);
        var players = zoneService.getNearbyPlayers(userId);
        List<Map<String, Object>> list = players.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("playerId", p.playerId);
            m.put("name", p.name);
            m.put("level", p.level);
            m.put("zoneId", p.zoneId);
            m.put("portraitUrl", p.portraitUrl);
            return m;
        }).toList();
        return ok(Map.of("players", list));
    }

    private Map<String, Object> zoneInfoToMap(com.iohao.mmo.map.proto.ZoneInfoProto info) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("zoneId", info.zoneId);
        m.put("name", info.name);
        m.put("coordX", info.coordX);
        m.put("coordY", info.coordY);
        m.put("description", info.description);
        m.put("sceneHint", info.sceneHint);
        m.put("exits", info.exits == null ? List.of() : info.exits.stream().map(e -> {
            Map<String, Object> em = new LinkedHashMap<>();
            em.put("direction", e.direction);
            em.put("targetZoneId", e.targetZoneId);
            em.put("label", e.label);
            return em;
        }).toList());
        m.put("hotEvents", info.hotEvents == null ? List.of() : info.hotEvents.stream().map(h -> {
            Map<String, Object> hm = new LinkedHashMap<>();
            hm.put("id", h.id);
            hm.put("label", h.label);
            hm.put("pageId", h.pageId);
            return hm;
        }).toList());
        m.put("nearbyPlayers", info.nearbyPlayers == null ? List.of() : info.nearbyPlayers.stream().map(p -> {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("playerId", p.playerId);
            pm.put("name", p.name);
            pm.put("level", p.level);
            pm.put("zoneId", p.zoneId);
            return pm;
        }).toList());
        return m;
    }

    // ── 拍卖行 (Auction) ───────────────────────────────

    @GetMapping("/auction/list")
    public ResponseEntity<Map<String, Object>> auctionList(@RequestParam(defaultValue = "all") String tab,
                                                           @RequestParam(defaultValue = "1") int page,
                                                           HttpSession session) {
        long userId = requireLogin(session);
        var res = auctionService.listAuctions(tab, userId);
        List<Map<String, Object>> items = res.items.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("auctionId", p.auctionId);
            m.put("itemId", p.itemId);
            m.put("itemName", p.itemName);
            m.put("itemQuality", p.itemQuality);
            m.put("sellerId", p.sellerId);
            m.put("sellerName", p.sellerName);
            m.put("currentBid", p.currentBid);
            m.put("buyNowPrice", p.buyNowPrice);
            m.put("bidCount", p.bidCount);
            m.put("endTime", p.endTime);
            m.put("status", p.status);
            m.put("myBid", p.myBid);
            return m;
        }).toList();
        return ok(Map.of("items", items, "total", res.total));
    }

    @PostMapping("/auction/bid")
    public ResponseEntity<Map<String, Object>> auctionBid(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String auctionId = (String) body.get("auctionId");
        long amount = ((Number) body.get("amount")).longValue();
        String username = (String) session.getAttribute("username");
        try {
            auctionService.placeBid(auctionId, userId, username != null ? username : "玩家" + userId, amount);
            return ok(Map.of("msg", "出价成功"));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/auction/buy-now")
    public ResponseEntity<Map<String, Object>> auctionBuyNow(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String auctionId = (String) body.get("auctionId");
        try {
            auctionService.buyNow(auctionId, userId);
            return ok(Map.of("msg", "购买成功"));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/auction/list-item")
    public ResponseEntity<Map<String, Object>> auctionListItem(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String username = (String) session.getAttribute("username");
        String itemId = (String) body.get("itemId");
        String itemName = (String) body.getOrDefault("itemName", "物品");
        String itemQuality = (String) body.getOrDefault("itemQuality", "white");
        long startPrice = ((Number) body.getOrDefault("startPrice", 100)).longValue();
        long buyNowPrice = ((Number) body.getOrDefault("buyNowPrice", 0)).longValue();
        int durationHours = ((Number) body.getOrDefault("durationHours", 24)).intValue();
        try {
            auctionService.listItem(userId, username != null ? username : "玩家" + userId,
                    itemId, itemName, itemQuality, startPrice, buyNowPrice, durationHours);
            return ok(Map.of("msg", "上架成功"));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/auction/cancel")
    public ResponseEntity<Map<String, Object>> auctionCancel(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String auctionId = (String) body.get("auctionId");
        try {
            auctionService.cancelListing(auctionId, userId);
            return ok(Map.of("msg", "已撤回"));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── 留言板 (Message Board) ─────────────────────────

    @GetMapping("/message-board/list")
    public ResponseEntity<Map<String, Object>> messageBoardList(@RequestParam(defaultValue = "world") String zoneId,
                                                                HttpSession session) {
        requireLogin(session);
        var msgs = boardMessages.getOrDefault(zoneId, new CopyOnWriteArrayList<>());
        var sorted = new ArrayList<>(msgs);
        sorted.sort((a, b) -> Long.compare((Long) b.get("createdAt"), (Long) a.get("createdAt")));
        var out = sorted.stream().limit(50).map(m -> {
            Map<String, Object> copy = new LinkedHashMap<>(m);
            copy.putIfAbsent("type", "user");
            return copy;
        }).toList();
        return ok(Map.of("messages", out));
    }

    @PostMapping("/message-board/post")
    public ResponseEntity<Map<String, Object>> messageBoardPost(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String content = (String) body.get("content");
        if (content == null || content.isBlank()) return err("内容不能为空");
        if (content.length() > 140) return err("内容不能超过140字");
        String zoneId = (String) body.getOrDefault("zoneId", "world");
        String type = sanitizeBoardType((String) body.get("type"));
        String username = (String) session.getAttribute("username");
        Map<String, Object> msg = new LinkedHashMap<>();
        msg.put("id", java.util.UUID.randomUUID().toString());
        msg.put("authorId", userId);
        msg.put("authorName", username != null ? username : "玩家" + userId);
        msg.put("content", content);
        msg.put("zoneId", zoneId);
        msg.put("type", type);
        msg.put("createdAt", System.currentTimeMillis());
        boardMessages.computeIfAbsent(zoneId, k -> new CopyOnWriteArrayList<>()).add(0, msg);
        return ok(msg);
    }

    /** 留言板类别白名单：user/ad/trade/system；未知值归并为 user */
    private String sanitizeBoardType(String raw) {
        if (raw == null) return "user";
        return switch (raw) {
            case "ad", "trade", "system", "user" -> raw;
            default -> "user";
        };
    }

    // ── 玩友 (Friend) ────────────────────────────────

    @GetMapping("/friend/list")
    public ResponseEntity<Map<String, Object>> friendList(HttpSession session) {
        long userId = requireLogin(session);
        var list = friendMap.computeIfAbsent(userId, this::createDefaultFriends);
        return ok(Map.of("friends", list));
    }

    @PostMapping("/friend/add")
    public ResponseEntity<Map<String, Object>> friendAdd(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        long targetId = ((Number) body.get("targetPlayerId")).longValue();
        String targetName = "玩家" + targetId;
        Map<String, Object> friend = createFriendProfile(targetId, targetName, "刚刚在线", "在主城闲逛，欢迎切磋。");
        var list = friendMap.computeIfAbsent(userId, this::createDefaultFriends);
        boolean exists = list.stream().anyMatch(item -> Objects.equals(((Number) item.get("playerId")).longValue(), targetId));
        if (!exists) {
            list.add(0, friend);
        }
        return ok(Map.of("success", true, "msg", "已添加玩友"));
    }

    @PostMapping("/friend/remove")
    public ResponseEntity<Map<String, Object>> friendRemove(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        long targetId = ((Number) body.get("targetPlayerId")).longValue();
        var list = friendMap.computeIfAbsent(userId, this::createDefaultFriends);
        list.removeIf(item -> Objects.equals(((Number) item.get("playerId")).longValue(), targetId));
        return ok(Map.of("success", true, "msg", "已删除玩友"));
    }

    // ── 邮件 (Mail) ────────────────────────────────

    @GetMapping("/mail/list")
    public ResponseEntity<Map<String, Object>> mailList(HttpSession session) {
        long userId = requireLogin(session);
        var list = mailMap.computeIfAbsent(userId, this::createDefaultMails);
        return ok(Map.of("mails", list));
    }

    @PostMapping("/mail/read")
    public ResponseEntity<Map<String, Object>> mailRead(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String mailId = (String) body.get("mailId");
        var list = mailMap.computeIfAbsent(userId, this::createDefaultMails);
        Map<String, Object> mail = list.stream()
                .filter(item -> Objects.equals(item.get("id"), mailId))
                .findFirst()
                .orElse(null);
        if (mail == null) return err("邮件不存在");
        mail.put("read", true);
        return ok(mail);
    }

    @PostMapping("/mail/claim")
    public ResponseEntity<Map<String, Object>> mailClaim(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String mailId = (String) body.get("mailId");
        var list = mailMap.computeIfAbsent(userId, this::createDefaultMails);
        Map<String, Object> mail = list.stream()
                .filter(item -> Objects.equals(item.get("id"), mailId))
                .findFirst()
                .orElse(null);
        if (mail == null) return err("邮件不存在");
        mail.put("read", true);
        mail.put("rewardClaimed", true);
        return ok(Map.of("success", true, "reward", mail.getOrDefault("reward", "奖励已领取")));
    }

    // ── 婚介 (Marriage) ────────────────────────────────

    @GetMapping("/marriage/status")
    public ResponseEntity<Map<String, Object>> marriageStatus(HttpSession session) {
        long userId = requireLogin(session);
        Map<String, Object> partner = marriageMap.get(userId);
        Map<String, Object> pending = proposeMap.get(userId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("married", partner != null);
        if (partner != null) data.put("partner", partner);
        data.put("hasPendingProposal", pending != null);
        if (pending != null) data.put("proposal", pending);
        return ok(data);
    }

    @GetMapping("/marriage/matchmaking")
    public ResponseEntity<Map<String, Object>> marriageMatchmaking(HttpSession session) {
        long userId = requireLogin(session);
        List<Map<String, Object>> candidates = new ArrayList<>();
        // Return online players not already married (simplified)
        marriageMap.forEach((pid, v) -> {/* skip married */});
        // Mock a few candidates from session context
        candidates.add(Map.of("playerId", 10001L, "name", "云中仙", "level", 50, "intro", "寻觅有缘人"));
        candidates.add(Map.of("playerId", 10002L, "name", "梦里人", "level", 38, "intro", "共游书境"));
        return ok(Map.of("candidates", candidates));
    }

    @PostMapping("/marriage/propose")
    public ResponseEntity<Map<String, Object>> marriagePropose(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        long targetId = ((Number) body.get("targetPlayerId")).longValue();
        if (marriageMap.containsKey(userId)) return err("您已婚配");
        if (marriageMap.containsKey(targetId)) return err("对方已婚配");
        String username = (String) session.getAttribute("username");
        proposeMap.put(targetId, Map.of("fromId", userId, "fromName", username != null ? username : "玩家" + userId, "createdAt", System.currentTimeMillis()));

        // Auto-accept for demo
        long now = System.currentTimeMillis();
        marriageMap.put(userId, Map.of("partnerId", targetId, "partnerName", "玩家" + targetId, "createdAt", now));
        marriageMap.put(targetId, Map.of("partnerId", userId, "partnerName", username != null ? username : "玩家" + userId, "createdAt", now));
        proposeMap.remove(targetId);
        return ok(Map.of("msg", "结婚成功！"));
    }

    @PostMapping("/marriage/divorce")
    public ResponseEntity<Map<String, Object>> marriageDivorce(HttpSession session) {
        long userId = requireLogin(session);
        Map<String, Object> partner = marriageMap.remove(userId);
        if (partner == null) return err("您尚未婚配");
        long partnerId = ((Number) partner.get("partnerId")).longValue();
        marriageMap.remove(partnerId);
        return ok(Map.of("msg", "已离婚"));
    }

    // ── 在线奖励 (Online Rewards) ──────────────────────

    @GetMapping("/event/online-rewards")
    public ResponseEntity<Map<String, Object>> onlineRewards(HttpSession session) {
        requireLogin(session);
        List<Map<String, Object>> rewards = List.of(
            Map.of("rewardId", "online_30m", "label", "在线30分钟", "requiredMinutes", 30, "rewardDesc", "金币 * 100", "claimed", false, "available", true),
            Map.of("rewardId", "online_1h", "label", "在线1小时", "requiredMinutes", 60, "rewardDesc", "金币 * 300", "claimed", false, "available", true),
            Map.of("rewardId", "online_3h", "label", "在线3小时", "requiredMinutes", 180, "rewardDesc", "金币 * 800", "claimed", false, "available", false)
        );
        return ok(Map.of("rewards", rewards, "onlineMinutes", 78));
    }

    @PostMapping("/event/claim-online")
    public ResponseEntity<Map<String, Object>> claimOnlineReward(@RequestBody Map<String, Object> body, HttpSession session) {
        requireLogin(session);
        String rewardId = (String) body.get("rewardId");
        return ok(Map.of("success", true, "reward", rewardId + " 已领取"));
    }

    // ── 集市 (Market / 玩家挂单) ───────────────────────

    @GetMapping("/market/list")
    public ResponseEntity<Map<String, Object>> marketList(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            HttpSession session) {
        requireLogin(session);
        int pageSize = 30;
        String catFilter = (category == null || category.isBlank()) ? null : category;
        String kwFilter = (keyword == null || keyword.isBlank()) ? null : keyword.toLowerCase(java.util.Locale.ROOT);
        var all = marketListings.values().stream()
                .filter(l -> "ACTIVE".equals(l.get("status")))
                .filter(l -> catFilter == null || catFilter.equals(l.get("itemCategory")))
                .filter(l -> kwFilter == null || ((String) l.getOrDefault("itemName", ""))
                        .toLowerCase(java.util.Locale.ROOT).contains(kwFilter))
                .sorted((a, b) -> Long.compare((Long) b.get("createdAt"), (Long) a.get("createdAt")))
                .toList();
        int total = all.size();
        int from = Math.min(page * pageSize, total);
        int to = Math.min(from + pageSize, total);
        var items = all.subList(from, to).stream().map(this::marketView).toList();
        return ok(Map.of("items", items, "total", total));
    }

    @PostMapping("/market/sell")
    public ResponseEntity<Map<String, Object>> marketSell(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String itemId = (String) body.get("itemId");
        if (itemId == null || itemId.isBlank()) return err("物品不能为空");
        long price = ((Number) body.getOrDefault("price", 0)).longValue();
        if (price <= 0) return err("价格需大于 0");
        int quantity = ((Number) body.getOrDefault("quantity", 1)).intValue();
        if (quantity <= 0) return err("数量需大于 0");

        String itemName = (String) body.getOrDefault("itemName", "物品");
        String itemCategory = (String) body.getOrDefault("itemCategory", "misc");
        String itemQuality = (String) body.getOrDefault("itemQuality", "common");
        String sellerName = (String) session.getAttribute("username");
        if (sellerName == null || sellerName.isBlank()) sellerName = "玩家" + userId;

        String listingId = java.util.UUID.randomUUID().toString();
        Map<String, Object> listing = new LinkedHashMap<>();
        listing.put("listingId", listingId);
        listing.put("sellerId", userId);
        listing.put("sellerName", sellerName);
        listing.put("itemId", itemId);
        listing.put("itemName", itemName);
        listing.put("itemCategory", itemCategory);
        listing.put("itemQuality", itemQuality);
        listing.put("unitPrice", price);
        listing.put("quantity", quantity);
        listing.put("sold", 0);
        listing.put("createdAt", System.currentTimeMillis());
        listing.put("status", "ACTIVE");
        marketListings.put(listingId, listing);
        return ok(Map.of("listingId", listingId));
    }

    @PostMapping("/market/buy")
    public ResponseEntity<Map<String, Object>> marketBuy(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String listingId = (String) body.get("listingId");
        int quantity = ((Number) body.getOrDefault("quantity", 1)).intValue();
        if (quantity <= 0) return err("数量需大于 0");

        Map<String, Object> listing = marketListings.get(listingId);
        if (listing == null) return err("挂单不存在");
        if (!"ACTIVE".equals(listing.get("status"))) return err("挂单已结束");
        Long sellerId = ((Number) listing.get("sellerId")).longValue();
        if (sellerId != null && sellerId == userId) return err("不能购买自己的挂单");

        int remain = ((Number) listing.get("quantity")).intValue() - ((Number) listing.get("sold")).intValue();
        if (remain <= 0) return err("库存不足");
        int buy = Math.min(quantity, remain);
        int newSold = ((Number) listing.get("sold")).intValue() + buy;
        listing.put("sold", newSold);
        if (newSold >= ((Number) listing.get("quantity")).intValue()) {
            listing.put("status", "SOLD_OUT");
        }
        return ok(Map.of("success", true, "bought", buy, "remaining", remain - buy));
    }

    @GetMapping("/market/my-listings")
    public ResponseEntity<Map<String, Object>> marketMyListings(HttpSession session) {
        long userId = requireLogin(session);
        var mine = marketListings.values().stream()
                .filter(l -> ((Number) l.get("sellerId")).longValue() == userId)
                .sorted((a, b) -> Long.compare((Long) b.get("createdAt"), (Long) a.get("createdAt")))
                .map(this::marketView).toList();
        return ok(Map.of("items", mine));
    }

    @PostMapping("/market/cancel")
    public ResponseEntity<Map<String, Object>> marketCancel(@RequestBody Map<String, Object> body, HttpSession session) {
        long userId = requireLogin(session);
        String listingId = (String) body.get("listingId");
        Map<String, Object> listing = marketListings.get(listingId);
        if (listing == null) return err("挂单不存在");
        if (((Number) listing.get("sellerId")).longValue() != userId) return err("无权撤回");
        if (!"ACTIVE".equals(listing.get("status"))) return err("挂单已结束");
        listing.put("status", "CANCELLED");
        return ok(Map.of("success", true));
    }

    private Map<String, Object> marketView(Map<String, Object> listing) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("listingId", listing.get("listingId"));
        v.put("itemId", listing.get("itemId"));
        v.put("itemName", listing.get("itemName"));
        v.put("itemCategory", listing.get("itemCategory"));
        v.put("itemQuality", listing.get("itemQuality"));
        v.put("sellerId", listing.get("sellerId"));
        v.put("sellerName", listing.get("sellerName"));
        v.put("unitPrice", listing.get("unitPrice"));
        v.put("quantity", listing.get("quantity"));
        v.put("sold", listing.get("sold"));
        v.put("createdAt", listing.get("createdAt"));
        return v;
    }

    // ── VIP / 成长线 ──────────────────────────────────

    @GetMapping("/vip/info")
    public ResponseEntity<Map<String, Object>> vipInfo(HttpSession session) {
        requireLogin(session);
        int currentLevel = 0;
        long currentExp = 0L;
        long nextLevelExp = 500L;
        List<Map<String, Object>> benefits = List.of(
            Map.of("key", "auctionFee",    "name", "拍卖手续费 -50%", "unlockLevel", 3),
            Map.of("key", "offlineBoost",  "name", "离线托管时长 +8h", "unlockLevel", 5),
            Map.of("key", "bossBonus",     "name", "世界 Boss 额外奖励", "unlockLevel", 8),
            Map.of("key", "onlineDouble",  "name", "每日在线领奖翻倍", "unlockLevel", 10),
            Map.of("key", "expBonus",      "name", "每日经验加成 +20%", "unlockLevel", 2),
            Map.of("key", "gemDaily",      "name", "每日赠送 50 玩币", "unlockLevel", 4)
        );
        List<Map<String, Object>> milestones = List.of(
            Map.of("level", 1, "cost", 100,  "reward", "玩币 * 200"),
            Map.of("level", 3, "cost", 500,  "reward", "玩币 * 1500"),
            Map.of("level", 5, "cost", 2000, "reward", "紫装宝箱 * 1"),
            Map.of("level", 8, "cost", 8000, "reward", "金装宝箱 * 1"),
            Map.of("level", 10, "cost", 20000, "reward", "终极尊荣座骑")
        );
        return ok(Map.ofEntries(
            Map.entry("level", currentLevel),
            Map.entry("currentExp", currentExp),
            Map.entry("nextLevelExp", nextLevelExp),
            Map.entry("benefits", benefits),
            Map.entry("milestones", milestones),
            Map.entry("monthlyCardActive", false),
            Map.entry("monthlyCardExpireAt", 0L)
        ));
    }
}
