package com.iohao.mmo.api;

import com.alibaba.fastjson2.JSON;
import com.iohao.mmo.bookworld.entity.BookWorld;
import com.iohao.mmo.bookworld.service.BookCrawlService;
import com.iohao.mmo.bookworld.service.BookRagService;
import com.iohao.mmo.bookworld.service.BookWorldService;
import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.entity.Relation;
import com.iohao.mmo.fate.repository.NpcTemplateRepository;
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
import com.iohao.mmo.companion.entity.SpiritCompanion;
import com.iohao.mmo.companion.service.CompanionService;
import com.iohao.mmo.story.entity.SceneImage;
import com.iohao.mmo.story.service.SceneImageService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.util.*;
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
    ExploreService exploreService;

    private final ExecutorService sseExecutor = Executors.newCachedThreadPool();

    // ── 认证 ─────────────────────────────────────────

    @PostMapping("/auth/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body, HttpSession session) {
        try {
            User user = userService.register(body.get("username"), body.get("password"));
            session.setAttribute("userId", user.getId());
            session.setAttribute("username", user.getUsername());
            return ok(Map.of("userId", user.getId(), "username", user.getUsername(), "nickname", user.getNickname()));
        } catch (Exception e) {
            return err(e.getMessage());
        }
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
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return err("未登录");
        return ok(Map.of("userId", userId, "username", session.getAttribute("username")));
    }

    // ── 剧情对话 ──────────────────────────────────────

    @PostMapping("/story/start")
    public ResponseEntity<Map<String, Object>> startDialogue(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
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
                // 从最后一条NPC消息中提取choices等信息
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
        } catch (Exception e) {
            log.warn("startDialogue error", e);
            return err(e.getMessage());
        }
    }

    @PostMapping("/story/choice")
    public ResponseEntity<Map<String, Object>> sendChoice(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String sessionId = (String) body.get("sessionId");
            int choiceId = ((Number) body.get("choiceId")).intValue();
            String npcId = (String) body.getOrDefault("npcId", "");
            int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();

            DialogueMessage reply = storyService.processChoice(sessionId, choiceId);
            if (reply != null && reply.fateDelta != 0) {
                try { fateService.applyChoice(userId, npcId, worldIndex, reply.fateDelta, reply.trustDelta); } catch (Exception ignored) {}
            }
            return ok(dialogueToMap(sessionId, reply));
        } catch (Exception e) {
            log.warn("sendChoice error", e);
            return err(e.getMessage());
        }
    }

    @PostMapping("/story/input")
    public ResponseEntity<Map<String, Object>> sendFreeInput(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String sessionId = (String) body.get("sessionId");
            String text = (String) body.get("text");
            String npcId = (String) body.getOrDefault("npcId", "");
            int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();

            DialogueMessage reply = storyService.processFreeInput(sessionId, text);
            if (reply != null && reply.fateDelta != 0) {
                try { fateService.applyChoice(userId, npcId, worldIndex, reply.fateDelta, reply.trustDelta); } catch (Exception ignored) {}
            }
            return ok(dialogueToMap(sessionId, reply));
        } catch (Exception e) {
            log.warn("sendFreeInput error", e);
            return err(e.getMessage());
        }
    }

    @PostMapping("/story/end")
    public ResponseEntity<Map<String, Object>> endDialogue(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
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
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── SSE 流式对话 ──────────────────────────────────

    @PostMapping(value = "/story/stream/start", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamStartDialogue(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        SseEmitter emitter = new SseEmitter(120_000L);
        if (userId == null) { completeWithError(emitter, "未登录"); return emitter; }

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
        Long userId = requireLogin(session);
        SseEmitter emitter = new SseEmitter(120_000L);
        if (userId == null) { completeWithError(emitter, "未登录"); return emitter; }

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
        Long userId = requireLogin(session);
        SseEmitter emitter = new SseEmitter(120_000L);
        if (userId == null) { completeWithError(emitter, "未登录"); return emitter; }

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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String npcId = (String) body.get("npcId");
            int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();
            String artStyleOverride = (String) body.getOrDefault("artStyle", null);
            String sceneHint = (String) body.getOrDefault("sceneHint", null);

            // 获取NPC信息
            Optional<NpcTemplate> npcOpt = fateService.getNpcTemplate(npcId);
            NpcTemplate npc = npcOpt.orElse(null);
            String npcName = npc != null ? npc.getNpcName() : "神秘角色";
            String bookTitle = npc != null ? npc.getBookTitle() : "仙侠世界";
            String personality = npc != null ? npc.getPersonality() : "飘逸神秘";
            String role = npc != null ? npc.getRole() : "";
            String gender = npc != null ? npc.getGender() : "";
            String features = npc != null ? npc.getFeatures() : "";

            // 决定图片风格：用户自定义 > 书籍artStyle > 默认
            String artStyle = resolveArtStyle(userId, worldIndex, bookTitle, artStyleOverride);

            // 带场景提示时不使用缓存（场景变化时需要新图）
            String cacheKey = (sceneHint != null && !sceneHint.isBlank())
                    ? npcId + "_" + worldIndex + "_" + sceneHint.hashCode() + "_" + artStyle.hashCode()
                    : npcId + "_" + worldIndex + "_" + artStyle.hashCode();
            String prompt = buildScenePrompt(npcName, bookTitle, personality, role, artStyle, sceneHint, gender, features);

            Optional<SceneImage> result = sceneImageService.getOrGenerate(cacheKey, prompt);
            if (result.isEmpty()) {
                return err("图片生成失败");
            }

            String imageId = result.get().getId();
            return ok(Map.of("imageId", imageId, "imageUrl", "/api/story/scene-image/" + imageId));
        } catch (Exception e) {
            log.warn("scene-image error", e);
            return err(e.getMessage());
        }
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

    // ── 缘分系统 ──────────────────────────────────────

    @GetMapping("/fate/map")
    public ResponseEntity<Map<String, Object>> getFateMap(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        return ok(fateService.buildFateMapData(userId));
    }

    @GetMapping("/fate/relations")
    public ResponseEntity<Map<String, Object>> getRelations(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        List<Relation> relations = fateService.getRelations(userId);
        List<Map<String, Object>> list = relations.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("npcId", r.getNpcId());
            m.put("npcName", r.getNpcName());
            m.put("fateScore", r.getFateScore());
            m.put("trustScore", r.getTrustScore());
            m.put("worldIndex", r.getWorldIndex());
            m.put("emotion", r.getLastEmotion());
            m.put("milestone", r.isAtMilestone());
            return m;
        }).toList();
        return ok(Map.of("relations", list));
    }

    // ── 七世轮回 ──────────────────────────────────────

    @GetMapping("/rebirth/status")
    public ResponseEntity<Map<String, Object>> getRebirthStatus(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
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
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/rebirth/select-book")
    public ResponseEntity<Map<String, Object>> selectBook(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String bookId = (String) body.get("bookId");
            String bookTitle = (String) body.get("bookTitle");
            var record = rebirthService.selectNextBook(userId, bookId, bookTitle);
            if (record == null) return err("已完成七世轮回");
            return ok(Map.of("worldIndex", record.getWorldIndex(), "bookId", bookId, "bookTitle", bookTitle));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── 角色 ──────────────────────────────────────

    @GetMapping("/person/me")
    public ResponseEntity<Map<String, Object>> getPersonInfo(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        Person person = personService.getPersonById(userId);
        if (person == null) return ok(Map.of("exists", false));
        Map<String, Object> m = new HashMap<>();
        m.put("exists", true);
        m.put("id", person.getId());
        m.put("name", person.getName());
        if (person.getBasicProperty() != null) {
            var bp = person.getBasicProperty();
            m.put("basicProperty", Map.of(
                "hp", bp.getHp(), "mp", bp.getMp(),
                "physicsAttack", bp.getPhysicsAttack(), "physicsDefense", bp.getPhysicsDefense(),
                "magicAttack", bp.getMagicAttack(), "magicDefense", bp.getMagicDefense(),
                "speed", bp.getSpeed()
            ));
        }
        return ok(m);
    }

    @PostMapping("/person/init")
    public ResponseEntity<Map<String, Object>> initPerson(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String name = (String) body.getOrDefault("name", "");
            personService.initPerson(userId);
            // 如果提供了自定义名称，更新并持久化
            if (name != null && !name.isBlank()) {
                personService.updateName(userId, name);
            }
            Person person = personService.getPersonById(userId);
            return ok(Map.of("id", person.getId(), "name", person.getName()));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── 背包 ──────────────────────────────────────

    @GetMapping("/bag/list")
    public ResponseEntity<Map<String, Object>> getBagList(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        Bag bag = bagService.ofBag(userId);
        List<Map<String, Object>> items = new ArrayList<>();
        if (bag.getItemMap() != null) {
            bag.getItemMap().forEach((id, item) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", item.getId());
                m.put("itemTypeId", item.getItemTypeId());
                m.put("quantity", item.getQuantity());
                // 补充物品元信息
                ShopItem shopItem = shopService.getItem(item.getItemTypeId());
                if (shopItem != null) {
                    m.put("name", shopItem.getName());
                    m.put("icon", shopItem.getIcon());
                    m.put("description", shopItem.getDescription());
                    m.put("category", shopItem.getCategory());
                    m.put("quality", shopItem.getQuality());
                } else {
                    m.put("name", item.getItemTypeId());
                    m.put("icon", "📦");
                }
                items.add(m);
            });
        }
        return ok(Map.of("items", items));
    }

    @PostMapping("/bag/use")
    public ResponseEntity<Map<String, Object>> useBagItem(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String itemId = (String) body.get("id");
            String itemTypeId = (String) body.get("itemTypeId");
            int quantity = ((Number) body.getOrDefault("quantity", 1)).intValue();
            BagItem decrement = new BagItem();
            decrement.setId(itemId);
            decrement.setItemTypeId(itemTypeId);
            decrement.setQuantity(quantity);
            bagService.decrementItem(decrement, userId);
            return ok(Map.of("msg", "使用成功"));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── 任务 ──────────────────────────────────────

    @GetMapping("/quest/list")
    public ResponseEntity<Map<String, Object>> listQuests(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        List<Quest> quests = questService.listQuest(userId);
        return ok(Map.of("quests", quests.stream().map(this::questToMap).toList()));
    }

    @GetMapping("/quest/available")
    public ResponseEntity<Map<String, Object>> listAvailableQuests(HttpSession session,
                                                                    @RequestParam(defaultValue = "1") int level) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String questId = (String) body.get("questId");
            Quest quest = questService.acceptQuest(userId, questId);
            if (quest == null) return err("任务不存在或无法接取");
            return ok(questToMap(quest));
        } catch (Exception e) { return err(e.getMessage()); }
    }

    @PostMapping("/quest/abandon")
    public ResponseEntity<Map<String, Object>> abandonQuest(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String questId = (String) body.get("questId");
            Quest quest = questService.abandonQuest(userId, questId);
            if (quest == null) return err("任务不存在");
            return ok(Map.of("msg", "已放弃"));
        } catch (Exception e) { return err(e.getMessage()); }
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
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
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/equip/identify")
    public ResponseEntity<Map<String, Object>> identifyEquip(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String equipId = (String) body.get("equipId");
            Equip equip = equipService.resetEquip(equipId, BigDecimal.ZERO);
            return ok(equipToMap(equip));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/equip/delete")
    public ResponseEntity<Map<String, Object>> deleteEquips(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            @SuppressWarnings("unchecked")
            List<String> ids = (List<String>) body.get("ids");
            equipService.delBatch(ids);
            return ok(Map.of("msg", "删除成功"));
        } catch (Exception e) {
            return err(e.getMessage());
        }
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            int worldIndex = ((Number) body.get("worldIndex")).intValue();
            String bookId = (String) body.get("bookId");
            String customArtStyle = (String) body.getOrDefault("customArtStyle", null);
            bookWorldService.selectBook(userId, worldIndex, bookId, customArtStyle);
            return ok(Map.of("msg", "选择成功"));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    /** 查询当前已选书籍及其信息 */
    @GetMapping("/bookworld/selected")
    public ResponseEntity<Map<String, Object>> getSelectedBook(HttpSession session,
                                                                @RequestParam(defaultValue = "1") int worldIndex) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            int worldIndex = ((Number) body.getOrDefault("worldIndex", 1)).intValue();
            String customArtStyle = (String) body.get("customArtStyle");
            bookWorldService.updateCustomArtStyle(userId, worldIndex, customArtStyle);
            return ok(Map.of("msg", "风格更新成功"));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/bookworld/upload-content")
    public ResponseEntity<Map<String, Object>> uploadBookContent(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String bookId = (String) body.get("bookId");
            String content = (String) body.get("content");
            if (bookId == null || content == null || content.isBlank()) return err("参数缺失");
            int chunks = bookRagService.processBookContent(bookId, content);
            return ok(Map.of("msg", "处理完成", "chunks", chunks));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    /** 从网络爬取书籍并自动提取NPC */
    @PostMapping("/bookworld/add-from-web")
    public ResponseEntity<Map<String, Object>> addBookFromWeb(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
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
        } catch (Exception e) {
            log.warn("添加网络书籍失败: {}", e.getMessage());
            return err(e.getMessage());
        }
    }

    // ── 记忆碎片 ──────────────────────────────────────

    @GetMapping("/memory/list")
    public ResponseEntity<Map<String, Object>> listMemories(HttpSession session,
                                                             @RequestParam(required = false) Integer worldIndex) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        List<MemoryFragment> memories;
        if (worldIndex != null) {
            memories = memoryService.listMemories(userId).stream()
                    .filter(m -> m.getWorldIndex() == worldIndex)
                    .toList();
        } else {
            memories = memoryService.listMemories(userId);
        }
        List<Map<String, Object>> list = memories.stream().map(m -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", m.getId());
            map.put("npcId", m.getNpcId());
            map.put("npcName", m.getNpcName());
            map.put("worldIndex", m.getWorldIndex());
            map.put("title", m.getTitle());
            map.put("excerpt", m.getExcerpt());
            map.put("fateScore", m.getFateScore());
            map.put("locked", m.isLocked());
            map.put("emotionTone", m.getEmotionTone());
            return map;
        }).toList();
        return ok(Map.of("memories", list));
    }

    // ── 宠物 ──────────────────────────────────────

    @GetMapping("/pet/list")
    public ResponseEntity<Map<String, Object>> listPets(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        Collection<Pet> pets = petService.listPet(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (Pet p : pets) {
            list.add(petToMap(p));
        }
        return ok(Map.of("pets", list));
    }

    @GetMapping("/pet/templates")
    public ResponseEntity<Map<String, Object>> listPetTemplates(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        Pet pet = petService.randomPetRest(userId);
        return ok(Map.of("pet", petToMap(pet)));
    }

    @PostMapping("/pet/create")
    public ResponseEntity<Map<String, Object>> createPet(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        petService.deletePetRest(userId, body.get("petId"));
        return ok(Map.of("success", true));
    }

    // ── 技能 ──────────────────────────────────────

    @GetMapping("/skill/templates")
    public ResponseEntity<Map<String, Object>> listSkillTemplates(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            PlayerCurrency currency = shopService.getPlayerCurrency(userId);
            SkillService.UnlockResult result = skillService.unlockSkill(userId, body.get("skillTemplateId"), currency.getGold());
            // 扣除金币
            if (result.goldCost() > 0) {
                currency.addGold(-result.goldCost());
                shopService.saveCurrency(currency);
            }
            PlayerSkill skill = result.skill();
            return ok(Map.of("skillTemplateId", skill.getSkillTemplateId(),
                    "level", skill.getLevel(), "unlocked", skill.isUnlocked(),
                    "goldCost", result.goldCost(),
                    "remainingGold", currency.getGold()));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/skill/upgrade")
    public ResponseEntity<Map<String, Object>> upgradeSkill(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            PlayerSkill skill = skillService.upgradeSkill(userId, body.get("skillTemplateId"));
            return ok(Map.of("skillTemplateId", skill.getSkillTemplateId(),
                    "level", skill.getLevel(), "unlocked", skill.isUnlocked()));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── 战斗 ──────────────────────────────────────

    @PostMapping("/battle/start")
    public ResponseEntity<Map<String, Object>> startBattle(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        int hp = ((Number) body.getOrDefault("hp", 100)).intValue();
        int mp = ((Number) body.getOrDefault("mp", 50)).intValue();
        int pAtk = ((Number) body.getOrDefault("physicsAttack", 10)).intValue();
        int pDef = ((Number) body.getOrDefault("physicsDefense", 5)).intValue();
        int mAtk = ((Number) body.getOrDefault("magicAttack", 8)).intValue();
        int mDef = ((Number) body.getOrDefault("magicDefense", 5)).intValue();
        int speed = ((Number) body.getOrDefault("speed", 10)).intValue();
        // 查询玩家已学的COMBAT主动技能，构建BattleSkill列表
        List<BattleState.BattleSkill> battleSkills = buildBattleSkills(userId);
        BattleState state = battleService.startBattle(userId, hp, mp, pAtk, pDef, mAtk, mDef, speed, battleSkills);
        return ok(Map.of("battle", battleToMap(state)));
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        BattleState state = battleService.getBattleState(userId);
        if (state == null) return ok(Map.of("battle", Map.of()));
        return ok(Map.of("battle", battleToMap(state)));
    }

    @PostMapping("/battle/action")
    public ResponseEntity<Map<String, Object>> battleAction(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        int rewardGold = 80 + new Random().nextInt(41); // 80~120
        int rewardExp = 40 + new Random().nextInt(21);   // 40~60

        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        currency.addGold(rewardGold);
        shopService.saveCurrency(currency);

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("gold", rewardGold);
        detail.put("exp", rewardExp);

        // 20%概率掉落消耗品
        String[] dropPool = {"consumable_001", "consumable_002", "consumable_003"};
        if (new Random().nextInt(5) == 0) {
            String dropId = dropPool[new Random().nextInt(dropPool.length)];
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
        return detail;
    }

    // ── 商城 ──────────────────────────────────────

    @GetMapping("/shop/list")
    public ResponseEntity<Map<String, Object>> listShopItems(
            @RequestParam(required = false) String category, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
            list.add(m);
        }
        return ok(Map.of("items", list));
    }

    @GetMapping("/shop/currency")
    public ResponseEntity<Map<String, Object>> getPlayerCurrency(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        return ok(Map.of("gold", currency.getGold(), "diamond", currency.getDiamond()));
    }

    @PostMapping("/shop/purchase")
    public ResponseEntity<Map<String, Object>> purchaseItem(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        String itemId = (String) body.get("itemId");
        int quantity = ((Number) body.getOrDefault("quantity", 1)).intValue();
        try {
            Map<String, Object> result = shopService.purchaseItem(userId, itemId, quantity);
            // 购买成功后，物品入背包
            if (Boolean.TRUE.equals(result.get("success"))) {
                ShopItem shopItem = shopService.getItem(itemId);
                if (shopItem != null) {
                    deliverShopItemToBag(userId, shopItem, quantity);
                }
            }
            return ok(result);
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    /** 商城物品发放到背包 */
    private void deliverShopItemToBag(long userId, ShopItem shopItem, int quantity) {
        String category = shopItem.getCategory();
        // 武器/防具：不可叠加，每件独立
        if ("weapon".equals(category) || "armor".equals(category)) {
            for (int i = 0; i < quantity; i++) {
                BagItem bagItem = new BagItem();
                bagItem.setId(UUID.randomUUID().toString());
                bagItem.setItemTypeId(shopItem.getId());
                bagItem.setQuantity(1);
                bagService.incrementItem(bagItem, userId);
            }
        } else {
            // 消耗品/特殊物品：可叠加
            BagItem bagItem = new BagItem();
            bagItem.setId(shopItem.getId());
            bagItem.setItemTypeId(shopItem.getId());
            bagItem.setQuantity(quantity);
            bagService.incrementItem(bagItem, userId);
        }
    }

    @GetMapping("/shop/history")
    public ResponseEntity<Map<String, Object>> purchaseHistory(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        EquipEnchant enchant = enchantService.getOrCreateEnchant(equipId, userId);
        return ok(enchantToMap(enchant));
    }

    @PostMapping("/enchant/apply")
    public ResponseEntity<Map<String, Object>> applyEnchant(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        String equipId = (String) body.get("equipId");
        int runeLevel = ((Number) body.getOrDefault("runeLevel", 1)).intValue();
        try {
            EnchantRune.RuneLevel level = EnchantRune.RuneLevel.values()[Math.min(runeLevel - 1, 3)];
            EquipEnchant enchant = enchantService.enchantEquip(equipId, userId, level);
            return ok(enchantToMap(enchant));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── 副本 ──────────────────────────────────────

    @GetMapping("/dungeon/list")
    public ResponseEntity<Map<String, Object>> listDungeons(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        List<Dungeon> dungeons = adventureService.listDungeons(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (Dungeon d : dungeons) {
            list.add(dungeonToMap(d));
        }
        return ok(Map.of("dungeons", list));
    }

    @PostMapping("/dungeon/enter")
    public ResponseEntity<Map<String, Object>> enterDungeon(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        String dungeonId = (String) body.get("dungeonId");
        int difficulty = ((Number) body.getOrDefault("difficulty", 1)).intValue();
        try {
            Dungeon d = adventureService.enterDungeon(userId, dungeonId, difficulty);
            return ok(Map.of("dungeon", dungeonToMap(d)));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/dungeon/complete-stage")
    public ResponseEntity<Map<String, Object>> completeStage(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        String dungeonId = (String) body.get("dungeonId");
        int stageId = ((Number) body.getOrDefault("stageId", 1)).intValue();
        int stars = ((Number) body.getOrDefault("stars", 3)).intValue();
        try {
            Dungeon d = adventureService.completeStage(userId, dungeonId, stageId, stars);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("dungeon", dungeonToMap(d));

            // 副本完成时发放奖励
            if (d.getStatus() == Dungeon.DungeonStatus.COMPLETED && d.getReward() != null) {
                Map<String, Object> rewardDetail = distributeDungeonRewards(userId, d.getReward());
                result.put("rewardDetail", rewardDetail);
            }
            return ok(result);
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    /** 发放副本通关奖励 */
    private Map<String, Object> distributeDungeonRewards(long userId, Dungeon.DungeonReward reward) {
        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        if (reward.getGold() > 0) {
            currency.addGold(reward.getGold());
        }
        shopService.saveCurrency(currency);

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("gold", reward.getGold());
        detail.put("exp", reward.getExp());

        // 发放掉落物品到背包
        List<Map<String, Object>> droppedItems = new ArrayList<>();
        if (reward.getItems() != null) {
            for (Dungeon.ItemDrop drop : reward.getItems()) {
                BagItem bagItem = new BagItem();
                bagItem.setId(drop.getItemId());
                bagItem.setItemTypeId(drop.getItemId());
                bagItem.setQuantity(drop.getQuantity());
                bagService.incrementItem(bagItem, userId);
                droppedItems.add(Map.of(
                        "itemName", drop.getItemName(),
                        "quantity", drop.getQuantity(),
                        "rarity", drop.getRarity()
                ));
            }
        }
        detail.put("items", droppedItems);

        if (reward.getTitle() != null) detail.put("title", reward.getTitle());
        if (reward.getAchievement() != null) detail.put("achievement", reward.getAchievement());

        return detail;
    }

    @PostMapping("/dungeon/exit")
    public ResponseEntity<Map<String, Object>> exitDungeon(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            Dungeon d = adventureService.exitDungeon(userId, body.get("dungeonId"));
            return ok(Map.of("dungeon", dungeonToMap(d)));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── 图鉴 ──────────────────────────────────────

    @GetMapping("/codex/npc")
    public ResponseEntity<Map<String, Object>> codexNpc(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
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
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        List<SpiritCompanion> companions = companionService.listCompanions(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (SpiritCompanion c : companions) {
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
            list.add(m);
        }
        return ok(Map.of("companions", list));
    }

    // ── 探索 ──────────────────────────────────────

    @GetMapping("/explore/status")
    public ResponseEntity<Map<String, Object>> exploreStatus(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            return ok(exploreService.getStatus(userId));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/explore/action")
    public ResponseEntity<Map<String, Object>> exploreAction(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            int worldIndex = body.get("worldIndex") != null ? ((Number) body.get("worldIndex")).intValue() : 0;
            String bookTitle = (String) body.getOrDefault("bookTitle", "未知世界");
            ExploreEvent event = exploreService.explore(userId, worldIndex, bookTitle);
            Map<String, Object> eventMap = exploreEventToMap(event);
            return ok(Map.of("event", eventMap));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/explore/resolve")
    public ResponseEntity<Map<String, Object>> exploreResolve(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String eventId = (String) body.get("eventId");
            int choiceId = ((Number) body.get("choiceId")).intValue();
            Map<String, Object> reward = exploreService.resolveChoice(userId, eventId, choiceId);
            applyExploreRewards(userId, eventId, reward);
            return ok(reward);
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @GetMapping("/explore/history")
    public ResponseEntity<Map<String, Object>> exploreHistory(HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            List<ExploreEvent> events = exploreService.getHistory(userId);
            List<Map<String, Object>> list = events.stream().map(this::exploreEventToMap).toList();
            return ok(Map.of("events", list));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/explore/start-combat")
    public ResponseEntity<Map<String, Object>> exploreStartCombat(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String eventId = (String) body.get("eventId");
            // 获取玩家属性
            Person person = personService.getPersonById(userId);
            if (person == null || person.getBasicProperty() == null) {
                return err("角色未初始化，请先创建角色");
            }
            var bp = person.getBasicProperty();
            // 从探索事件获取敌人名
            String enemyName = (String) body.getOrDefault("enemyName", "妖兽");
            // 用玩家属性发起战斗
            BattleState state = battleService.startBattleWithEnemy(userId, enemyName,
                    bp.getHp(), bp.getMp(),
                    bp.getPhysicsAttack(), bp.getPhysicsDefense(),
                    bp.getMagicAttack(), bp.getMagicDefense(),
                    bp.getSpeed());
            // 关联战斗到探索事件
            exploreService.linkBattle(eventId, state.getId());
            return ok(Map.of("battle", battleToMap(state)));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/explore/resolve-combat")
    public ResponseEntity<Map<String, Object>> exploreResolveCombat(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = requireLogin(session);
        if (userId == null) return err("未登录");
        try {
            String eventId = (String) body.get("eventId");
            // 检查战斗结果
            BattleState state = battleService.getBattleState(userId);
            boolean victory;
            if (state != null && "VICTORY".equals(state.getStatus())) {
                victory = true;
            } else if (state != null && "DEFEAT".equals(state.getStatus())) {
                victory = false;
            } else {
                // 没有已结束的战斗，尝试查找关联的战斗
                victory = false;
            }
            Map<String, Object> reward = exploreService.resolveCombat(userId, eventId, victory);
            applyExploreRewards(userId, eventId, reward);
            return ok(reward);
        } catch (Exception e) {
            return err(e.getMessage());
        }
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

            // 3. 物品奖励 → BagService（映射到商城预定义物品）
            String itemName = (String) reward.get("itemName");
            if (itemName != null && !itemName.isBlank()) {
                String mappedItemId = mapExploreItemToShopItem(itemName);
                BagItem bagItem = new BagItem();
                bagItem.setId(mappedItemId);
                bagItem.setItemTypeId(mappedItemId);
                bagItem.setQuantity(1);
                bagService.incrementItem(bagItem, userId);
            }

            // 4. 金币奖励
            int goldReward = reward.get("gold") instanceof Number n ? n.intValue() : 0;
            if (goldReward > 0) {
                PlayerCurrency currency = shopService.getPlayerCurrency(userId);
                currency.addGold(goldReward);
                shopService.saveCurrency(currency);
            }
        } catch (Exception e) {
            log.warn("探索奖励发放异常: userId={}, eventId={}, err={}", userId, eventId, e.getMessage());
        }
    }

    /** 将AI生成的探索物品名映射到商城预定义物品ID */
    private String mapExploreItemToShopItem(String itemName) {
        if (itemName == null) return "consumable_001";
        String lower = itemName.toLowerCase();
        if (lower.contains("药") || lower.contains("heal") || lower.contains("生命")) return "consumable_001";
        if (lower.contains("魔") || lower.contains("mana") || lower.contains("法力")) return "consumable_002";
        if (lower.contains("经验") || lower.contains("exp")) return "consumable_003";
        if (lower.contains("卷轴") || lower.contains("scroll") || lower.contains("传送")) return "special_002";
        if (lower.contains("蛋") || lower.contains("egg") || lower.contains("宠物")) return "special_001";
        // 默认掉落生命药水
        return "consumable_001";
    }

    // ── 工具方法 ──────────────────────────────────────

    private Long requireLogin(HttpSession session) {
        return (Long) session.getAttribute("userId");
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
        m.put("type", d.getType() != null ? d.getType().name() : "STORY");
        m.put("currentStage", d.getCurrentStage());
        m.put("maxStage", d.getMaxStage());
        m.put("status", d.getStatus() != null ? d.getStatus().name() : "NOT_STARTED");
        m.put("difficulty", d.getDifficulty());
        m.put("firstClear", d.isFirstClear());
        m.put("clearCount", d.getClearCount());
        return m;
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
        m.put("constitution", pet.getConstitution());
        m.put("magicPower", pet.getMagicPower());
        m.put("power", pet.getPower());
        m.put("endurance", pet.getEndurance());
        m.put("agile", pet.getAgile());
        m.put("maxSkill", pet.getMaxSkill());
        m.put("aiImageUrl", pet.getAiImageUrl());
        m.put("petType", pet.getPetType());
        m.put("element", pet.getElement());
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
        return m;
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
}
