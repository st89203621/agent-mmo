package com.iohao.mmo.api;

import com.alibaba.fastjson2.JSON;
import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.entity.Relation;
import com.iohao.mmo.fate.service.FateService;
import com.iohao.mmo.login.entity.User;
import com.iohao.mmo.login.service.UserService;
import com.iohao.mmo.rebirth.service.RebirthService;
import com.iohao.mmo.story.entity.DialogueSession;
import com.iohao.mmo.story.proto.DialogueMessage;
import com.iohao.mmo.story.service.StoryService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

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
