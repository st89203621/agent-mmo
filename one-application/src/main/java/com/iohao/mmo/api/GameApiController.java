package com.iohao.mmo.api;

import com.alibaba.fastjson2.JSON;
import com.iohao.mmo.bookworld.entity.BookWorld;
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
    MemoryService memoryService;

    @Resource
    NpcTemplateRepository npcTemplateRepository;

    @Resource
    EquipService equipService;

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
    public ResponseEntity<Map<String, Object>> listNpcs(@RequestParam(defaultValue = "0") int worldIndex) {
        List<NpcTemplate> templates = npcTemplateRepository.findAll();
        List<Map<String, Object>> list = templates.stream().map(npc -> {
            Map<String, Object> m = new HashMap<>();
            m.put("npcId", npc.getNpcId());
            m.put("npcName", npc.getNpcName());
            m.put("bookTitle", npc.getBookTitle());
            m.put("personality", npc.getPersonality());
            m.put("role", npc.getRole());
            m.put("emotion", npc.getEmotion());
            m.put("portraitBase", npc.getPortraitBase());
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
            bookWorldService.selectBook(userId, worldIndex, bookId);
            return ok(Map.of("msg", "选择成功"));
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
        return m;
    }
}
