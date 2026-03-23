package com.iohao.mmo.story.service;

import com.alibaba.fastjson2.JSON;
import com.iohao.mmo.bookworld.service.BookRagService;
import com.iohao.mmo.bookworld.entity.PlayerBookSelection;
import com.iohao.mmo.bookworld.repository.PlayerBookSelectionRepository;
import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.entity.Relation;
import com.iohao.mmo.fate.repository.NpcTemplateRepository;
import com.iohao.mmo.fate.repository.RelationRepository;
import com.iohao.mmo.story.ai.AiDialogueService;
import com.iohao.mmo.story.ai.AiDialogueService.DialogueAiResult;
import com.iohao.mmo.story.entity.DialogueSession;
import com.iohao.mmo.story.entity.DialogueSession.DialogueRecord;
import com.iohao.mmo.story.proto.DialogueMessage;
import com.iohao.mmo.story.repository.DialogueSessionRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/**
 * 剧情对话服务 - 接入火山引擎豆包 AI 实时生成 NPC 对话
 */
@Slf4j
@Service
public class StoryService {

    @Resource
    DialogueSessionRepository dialogueSessionRepository;

    @Resource
    NpcTemplateRepository npcTemplateRepository;

    @Resource
    RelationRepository relationRepository;

    @Resource
    AiDialogueService aiDialogueService;

    @Resource
    BookRagService bookRagService;

    @Resource
    PlayerBookSelectionRepository playerBookSelectionRepository;

    /** 开始与 NPC 的对话，返回 session */
    public DialogueSession startDialogue(long playerId, String npcId, int worldIndex) {
        // 结束旧的活跃对话（可能存在多个未正常关闭的session）
        dialogueSessionRepository.findByPlayerIdAndActiveTrue(playerId).forEach(old -> {
            old.setActive(false);
            old.setEndTime(System.currentTimeMillis());
            dialogueSessionRepository.save(old);
        });

        DialogueSession session = new DialogueSession();
        session.setId(UUID.randomUUID().toString());
        session.setPlayerId(playerId);
        session.setNpcId(npcId);
        session.setWorldIndex(worldIndex);
        session.setMessages(new ArrayList<>());
        session.setStartTime(System.currentTimeMillis());
        session.setActive(true);
        session.setTotalFateDelta(0);
        session.setTotalTrustDelta(0);
        return dialogueSessionRepository.save(session);
    }

    /** NPC 开场白（进入对话时调用） */
    public DialogueMessage getOpeningLine(String sessionId) {
        DialogueSession session = dialogueSessionRepository.findById(sessionId).orElse(null);
        if (session == null) return errorDialogue("对话 session 不存在");

        NpcTemplate npc = getNpcTemplate(session.getNpcId());
        Relation relation = getOrNullRelation(session.getPlayerId(), session.getNpcId(), session.getWorldIndex());
        int fateScore = relation != null ? relation.getFateScore() : 0;

        String npcName = npc != null ? npc.getNpcName() : session.getNpcId();
        String bookContext = getBookContext(session.getPlayerId(), session.getWorldIndex(), npcName);

        DialogueAiResult ai = aiDialogueService.generateNpcResponse(
                npcName,
                npc != null ? npc.getPersonality() : "和蔼的 NPC",
                npc != null ? npc.getBookTitle() : "未知书籍世界",
                bookContext,
                "符合角色气质",
                relation != null ? relation.getKeyFacts() : Collections.emptyList(),
                fateScore,
                "（玩家走近打招呼）",
                ""
        );

        // 记录开场白
        DialogueRecord rec = new DialogueRecord();
        rec.setRole("npc");
        rec.setContent(ai.text);
        rec.setEmotion(ai.emotion);
        rec.setTimestamp(System.currentTimeMillis());
        rec.setChoicesJson(buildChoicesJson(ai));
        session.getMessages().add(rec);
        dialogueSessionRepository.save(session);

        return toMessage(session.getId(), ai, 0, 0);
    }

    /** 处理玩家选项选择 */
    public DialogueMessage processChoice(String sessionId, int choiceId) {
        DialogueSession session = dialogueSessionRepository.findById(sessionId).orElse(null);
        if (session == null || !session.isActive()) return errorDialogue("对话已结束或不存在");

        String choiceText = extractChoiceText(session, choiceId);
        int fateDelta = extractChoiceFateDelta(session, choiceId);
        int trustDelta = extractChoiceTrustDelta(session, choiceId);
        return generateAndRecord(session, choiceText, choiceId, fateDelta, trustDelta);
    }

    /** 处理玩家自由输入 */
    public DialogueMessage processFreeInput(String sessionId, String text) {
        DialogueSession session = dialogueSessionRepository.findById(sessionId).orElse(null);
        if (session == null || !session.isActive()) return errorDialogue("对话已结束或不存在");
        return generateAndRecord(session, text, -1, 1, 0);
    }

    /** 结束对话 */
    public DialogueSession endDialogue(String sessionId) {
        return dialogueSessionRepository.findById(sessionId).map(session -> {
            session.setActive(false);
            session.setEndTime(System.currentTimeMillis());
            return dialogueSessionRepository.save(session);
        }).orElse(null);
    }

    public Optional<DialogueSession> getActiveSession(long playerId) {
        return dialogueSessionRepository.findByPlayerIdAndActiveTrue(playerId).stream().findFirst();
    }

    // ── 流式AI对话 ─────────────────────────────────────

    /** 流式生成开场白 */
    public void getOpeningLineStream(String sessionId, Consumer<String> onChunk,
                                      Consumer<DialogueMessage> onComplete, Consumer<Exception> onError) {
        DialogueSession session = dialogueSessionRepository.findById(sessionId).orElse(null);
        if (session == null) { onError.accept(new RuntimeException("session不存在")); return; }

        NpcTemplate npc = getNpcTemplate(session.getNpcId());
        Relation relation = getOrNullRelation(session.getPlayerId(), session.getNpcId(), session.getWorldIndex());
        int fateScore = relation != null ? relation.getFateScore() : 0;

        String streamNpcName = npc != null ? npc.getNpcName() : session.getNpcId();
        String streamBookContext = getBookContext(session.getPlayerId(), session.getWorldIndex(), streamNpcName);

        aiDialogueService.generateNpcResponseStream(
                streamNpcName,
                npc != null ? npc.getPersonality() : "和蔼的 NPC",
                npc != null ? npc.getBookTitle() : "未知书籍世界",
                streamBookContext, "符合角色气质",
                relation != null ? relation.getKeyFacts() : Collections.emptyList(),
                fateScore, "（玩家走近打招呼）", "",
                onChunk,
                ai -> {
                    DialogueRecord rec = new DialogueRecord();
                    rec.setRole("npc"); rec.setContent(ai.text); rec.setEmotion(ai.emotion);
                    rec.setTimestamp(System.currentTimeMillis()); rec.setChoicesJson(buildChoicesJson(ai));
                    session.getMessages().add(rec);
                    dialogueSessionRepository.save(session);
                    onComplete.accept(toMessage(session.getId(), ai, 0, 0));
                },
                onError
        );
    }

    /** 流式处理玩家选择 */
    public void processChoiceStream(String sessionId, int choiceId,
                                     Consumer<String> onChunk, Consumer<DialogueMessage> onComplete, Consumer<Exception> onError) {
        DialogueSession session = dialogueSessionRepository.findById(sessionId).orElse(null);
        if (session == null || !session.isActive()) { onError.accept(new RuntimeException("对话已结束")); return; }

        String choiceText = extractChoiceText(session, choiceId);
        int fateDelta = extractChoiceFateDelta(session, choiceId);
        int trustDelta = extractChoiceTrustDelta(session, choiceId);
        generateAndRecordStream(session, choiceText, choiceId, fateDelta, trustDelta, onChunk, onComplete, onError);
    }

    /** 流式处理自由输入 */
    public void processFreeInputStream(String sessionId, String text,
                                        Consumer<String> onChunk, Consumer<DialogueMessage> onComplete, Consumer<Exception> onError) {
        DialogueSession session = dialogueSessionRepository.findById(sessionId).orElse(null);
        if (session == null || !session.isActive()) { onError.accept(new RuntimeException("对话已结束")); return; }
        generateAndRecordStream(session, text, -1, 1, 0, onChunk, onComplete, onError);
    }

    private void generateAndRecordStream(DialogueSession session, String playerInput,
                                          int choiceId, int fateDelta, int trustDelta,
                                          Consumer<String> onChunk, Consumer<DialogueMessage> onComplete, Consumer<Exception> onError) {
        NpcTemplate npc = getNpcTemplate(session.getNpcId());
        Relation relation = getOrNullRelation(session.getPlayerId(), session.getNpcId(), session.getWorldIndex());
        int fateScore = relation != null ? relation.getFateScore() : 0;

        // 先记录玩家行动
        DialogueRecord playerRec = new DialogueRecord();
        playerRec.setRole("player"); playerRec.setContent(playerInput);
        playerRec.setChoiceId(choiceId); playerRec.setTimestamp(System.currentTimeMillis());
        playerRec.setFateDelta(fateDelta);
        session.getMessages().add(playerRec);

        String recNpcName = npc != null ? npc.getNpcName() : session.getNpcId();
        String recBookContext = getBookContext(session.getPlayerId(), session.getWorldIndex(),
                recNpcName + " " + playerInput);

        aiDialogueService.generateNpcResponseStream(
                recNpcName,
                npc != null ? npc.getPersonality() : "和蔼的 NPC",
                npc != null ? npc.getBookTitle() : "未知书籍世界",
                recBookContext, "符合角色气质",
                relation != null ? relation.getKeyFacts() : Collections.emptyList(),
                fateScore, playerInput, buildHistoryText(session, 3),
                onChunk,
                ai -> {
                    DialogueRecord npcRec = new DialogueRecord();
                    npcRec.setRole("npc"); npcRec.setContent(ai.text); npcRec.setEmotion(ai.emotion);
                    npcRec.setTimestamp(System.currentTimeMillis()); npcRec.setChoicesJson(buildChoicesJson(ai));
                    session.getMessages().add(npcRec);
                    session.setTotalFateDelta(session.getTotalFateDelta() + fateDelta);
                    session.setTotalTrustDelta(session.getTotalTrustDelta() + trustDelta);
                    dialogueSessionRepository.save(session);
                    onComplete.accept(toMessage(session.getId(), ai, fateDelta, trustDelta));
                },
                onError
        );
    }

    // ── 核心：AI 生成并记录对话 ─────────────────────────────

    private DialogueMessage generateAndRecord(DialogueSession session, String playerInput,
                                               int choiceId, int fateDelta, int trustDelta) {
        NpcTemplate npc = getNpcTemplate(session.getNpcId());
        Relation relation = getOrNullRelation(session.getPlayerId(), session.getNpcId(), session.getWorldIndex());
        int fateScore = relation != null ? relation.getFateScore() : 0;

        String genNpcName = npc != null ? npc.getNpcName() : session.getNpcId();
        String genBookContext = getBookContext(session.getPlayerId(), session.getWorldIndex(),
                genNpcName + " " + playerInput);

        DialogueAiResult ai = aiDialogueService.generateNpcResponse(
                genNpcName,
                npc != null ? npc.getPersonality() : "和蔼的 NPC",
                npc != null ? npc.getBookTitle() : "未知书籍世界",
                genBookContext,
                "符合角色气质",
                relation != null ? relation.getKeyFacts() : Collections.emptyList(),
                fateScore,
                playerInput,
                buildHistoryText(session, 3)
        );

        // 记录玩家行动
        DialogueRecord playerRec = new DialogueRecord();
        playerRec.setRole("player");
        playerRec.setContent(playerInput);
        playerRec.setChoiceId(choiceId);
        playerRec.setTimestamp(System.currentTimeMillis());
        playerRec.setFateDelta(fateDelta);
        session.getMessages().add(playerRec);

        // 记录 NPC 回复
        DialogueRecord npcRec = new DialogueRecord();
        npcRec.setRole("npc");
        npcRec.setContent(ai.text);
        npcRec.setEmotion(ai.emotion);
        npcRec.setTimestamp(System.currentTimeMillis());
        npcRec.setChoicesJson(buildChoicesJson(ai));
        session.getMessages().add(npcRec);

        session.setTotalFateDelta(session.getTotalFateDelta() + fateDelta);
        session.setTotalTrustDelta(session.getTotalTrustDelta() + trustDelta);
        dialogueSessionRepository.save(session);

        return toMessage(session.getId(), ai, fateDelta, trustDelta);
    }

    // ── 工具方法 ──────────────────────────────────────────

    private String buildHistoryText(DialogueSession session, int maxRounds) {
        List<DialogueRecord> msgs = session.getMessages();
        if (msgs == null || msgs.isEmpty()) return "";
        int start = Math.max(0, msgs.size() - maxRounds * 2);
        return msgs.subList(start, msgs.size()).stream()
                .map(r -> ("player".equals(r.getRole()) ? "玩家：" : "NPC：") + r.getContent())
                .collect(Collectors.joining("\n"));
    }

    private String extractChoiceText(DialogueSession session, int choiceId) {
        return findInLastChoicesJson(session, choiceId, "text", "选择了选项" + choiceId);
    }

    private int extractChoiceFateDelta(DialogueSession session, int choiceId) {
        String v = findInLastChoicesJson(session, choiceId, "fate", "1");
        try { return Integer.parseInt(v); } catch (Exception e) { return 1; }
    }

    private int extractChoiceTrustDelta(DialogueSession session, int choiceId) {
        String v = findInLastChoicesJson(session, choiceId, "trust", "0");
        try { return Integer.parseInt(v); } catch (Exception e) { return 0; }
    }

    private String findInLastChoicesJson(DialogueSession session, int choiceId, String field, String def) {
        if (session.getMessages() == null) return def;
        for (int i = session.getMessages().size() - 1; i >= 0; i--) {
            DialogueRecord rec = session.getMessages().get(i);
            if ("npc".equals(rec.getRole()) && rec.getChoicesJson() != null) {
                try {
                    var arr = JSON.parseArray(rec.getChoicesJson());
                    for (int j = 0; j < arr.size(); j++) {
                        var c = arr.getJSONObject(j);
                        if (c.getIntValue("id") == choiceId) {
                            return c.getString(field) != null ? c.getString(field) : def;
                        }
                    }
                } catch (Exception ignored) {}
                break;
            }
        }
        return def;
    }

    private String buildChoicesJson(DialogueAiResult result) {
        if (result.choices == null) return "[]";
        var list = result.choices.stream().map(c -> {
            var map = new LinkedHashMap<String, Object>();
            map.put("id", c.id);
            map.put("text", c.text);
            map.put("fate", c.fateDelta);
            map.put("trust", c.trustDelta);
            return map;
        }).collect(Collectors.toList());
        return JSON.toJSONString(list);
    }

    private DialogueMessage toMessage(String sessionId, DialogueAiResult ai, int fateDelta, int trustDelta) {
        DialogueMessage msg = new DialogueMessage();
        msg.sessionId = sessionId;
        msg.speaker = ai.speaker;
        msg.emotion = ai.emotion;
        msg.text = ai.text;
        msg.allowFreeInput = ai.allowFreeInput;
        msg.fateDelta = fateDelta;
        msg.trustDelta = trustDelta;
        msg.choicesJson = buildChoicesJson(ai);
        msg.bookRefs = "[]";
        return msg;
    }

    private DialogueMessage errorDialogue(String text) {
        DialogueMessage m = new DialogueMessage();
        m.text = text;
        m.emotion = "neutral";
        m.choicesJson = "[]";
        return m;
    }

    /** 获取书籍RAG上下文：根据玩家当前世界选择的书籍，检索与对话相关的段落 */
    private String getBookContext(long playerId, int worldIndex, String queryText) {
        try {
            List<PlayerBookSelection> selList = playerBookSelectionRepository
                    .findByUserIdAndWorldIndexAndActiveTrue(playerId, worldIndex);
            if (selList.isEmpty()) return "";
            return bookRagService.retrieveContext(selList.get(0).getBookId(), queryText);
        } catch (Exception e) {
            log.debug("RAG检索跳过: {}", e.getMessage());
            return "";
        }
    }

    private NpcTemplate getNpcTemplate(String npcId) {
        List<NpcTemplate> list = npcTemplateRepository.findByNpcId(npcId);
        return list.isEmpty() ? null : list.get(0);
    }

    private Relation getOrNullRelation(long playerId, String npcId, int worldIndex) {
        List<Relation> list = relationRepository.findByPlayerIdAndNpcIdAndWorldIndex(playerId, npcId, worldIndex);
        return list.isEmpty() ? null : list.get(0);
    }
}
