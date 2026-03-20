package com.iohao.mmo.story.action;

import com.alibaba.fastjson2.JSON;
import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.repository.NpcTemplateRepository;
import com.iohao.mmo.fate.service.FateService;
import com.iohao.mmo.story.cmd.StoryCmd;
import com.iohao.mmo.story.entity.DialogueSession;
import com.iohao.mmo.story.proto.DialogueMessage;
import com.iohao.mmo.story.proto.DialogueRequest;
import com.iohao.mmo.story.service.StoryService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

@Slf4j
@Component
@ActionController(StoryCmd.cmd)
public class StoryAction {

    @Resource
    StoryService storyService;

    @Resource
    FateService fateService;

    @Resource
    NpcTemplateRepository npcTemplateRepository;

    /** 开始对话，返回 NPC AI 生成的开场白 */
    @ActionMethod(StoryCmd.startDialogue)
    public DialogueMessage startDialogue(DialogueRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        DialogueSession session = storyService.startDialogue(userId, request.npcId, request.worldIndex);
        return storyService.getOpeningLine(session.getId());
    }

    /** 玩家选择选项 */
    @ActionMethod(StoryCmd.sendChoice)
    public DialogueMessage sendChoice(DialogueRequest request, FlowContext flowContext) {
        DialogueMessage reply = storyService.processChoice(request.sessionId, request.choiceId);
        // 实时更新缘分
        if (reply != null && reply.fateDelta != 0) {
            long userId = flowContext.getUserId();
            updateFateAsync(userId, request.npcId, request.worldIndex, reply.fateDelta, reply.trustDelta);
        }
        return reply;
    }

    /** 玩家自由输入 */
    @ActionMethod(StoryCmd.sendFreeInput)
    public DialogueMessage sendFreeInput(DialogueRequest request, FlowContext flowContext) {
        DialogueMessage reply = storyService.processFreeInput(request.sessionId, request.freeText);
        if (reply != null && reply.fateDelta != 0) {
            long userId = flowContext.getUserId();
            updateFateAsync(userId, request.npcId, request.worldIndex, reply.fateDelta, reply.trustDelta);
        }
        return reply;
    }

    /** 结束对话，汇总并更新缘分 */
    @ActionMethod(StoryCmd.endDialogue)
    public String endDialogue(String sessionId, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        DialogueSession session = storyService.endDialogue(sessionId);
        if (session == null) {
            return "{\"error\":\"对话不存在\"}";
        }

        // 对话结束后应用累计缘分变化到关系系统
        if (session.getTotalFateDelta() != 0 || session.getTotalTrustDelta() != 0) {
            try {
                fateService.applyChoice(userId, session.getNpcId(), session.getWorldIndex(),
                        session.getTotalFateDelta(), session.getTotalTrustDelta());
                log.info("对话结束，缘分更新: userId={}, npcId={}, fateDelta={}, trustDelta={}",
                        userId, session.getNpcId(), session.getTotalFateDelta(), session.getTotalTrustDelta());
            } catch (Exception e) {
                log.warn("缘分更新失败: {}", e.getMessage());
            }
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("sessionId", sessionId);
        summary.put("npcId", session.getNpcId());
        summary.put("totalFateDelta", session.getTotalFateDelta());
        summary.put("totalTrustDelta", session.getTotalTrustDelta());
        summary.put("messageCount", session.getMessages() != null ? session.getMessages().size() : 0);
        summary.put("duration", session.getEndTime() - session.getStartTime());
        return JSON.toJSONString(summary);
    }

    /** 获取 NPC 基本信息 */
    @ActionMethod(StoryCmd.getNpcInfo)
    public String getNpcInfo(String npcId) {
        Optional<NpcTemplate> npcOpt = npcTemplateRepository.findByNpcId(npcId).stream().findFirst();
        Map<String, Object> info = new HashMap<>();
        npcOpt.ifPresentOrElse(npc -> {
            info.put("npcId", npcId);
            info.put("name", npc.getNpcName());
            info.put("bookTitle", npc.getBookTitle());
            info.put("personality", npc.getPersonality());
            info.put("role", npc.getRole());
            info.put("emotion", npc.getEmotion());
        }, () -> {
            info.put("npcId", npcId);
            info.put("name", npcId);
        });
        return JSON.toJSONString(info);
    }

    /** 获取某世界的 NPC 列表 */
    @ActionMethod(StoryCmd.listNpcs)
    public String listNpcs(int worldIndex) {
        List<Map<String, String>> npcs = new ArrayList<>();
        // 根据 worldIndex 返回对应书籍世界的 NPC
        String[][] worldNpcs = {
            {"npc_yunshang","云裳"}, {"npc_biyao","碧瑶"}, {"npc_xiaofan","张小凡"},    // 诛仙
            {"npc_hanli","韩立"},                                                        // 凡人
            {"npc_xiaoyan","萧炎"},                                                      // 斗破
            {"npc_shihao","石昊"},                                                       // 完美世界
        };
        for (String[] n : worldNpcs) {
            Map<String, String> m = new HashMap<>();
            m.put("npcId", n[0]);
            m.put("name", n[1]);
            npcs.add(m);
        }
        return JSON.toJSONString(Map.of("worldIndex", worldIndex, "npcs", npcs));
    }

    private void updateFateAsync(long userId, String npcId, int worldIndex, int fateDelta, int trustDelta) {
        try {
            fateService.applyChoice(userId, npcId, worldIndex, fateDelta, trustDelta);
        } catch (Exception e) {
            log.warn("实时缘分更新失败: {}", e.getMessage());
        }
    }
}
