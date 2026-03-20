package com.iohao.mmo.fate.action;

import com.alibaba.fastjson2.JSON;
import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.fate.cmd.FateCmd;
import com.iohao.mmo.fate.entity.Relation;
import com.iohao.mmo.fate.proto.FateChoiceRequest;
import com.iohao.mmo.fate.proto.RelationMessage;
import com.iohao.mmo.fate.service.FateService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Component
@ActionController(FateCmd.cmd)
public class FateAction {

    @Resource
    FateService fateService;

    @ActionMethod(FateCmd.getRelations)
    public List<RelationMessage> getRelations(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<Relation> relations = fateService.getRelations(userId);
        List<RelationMessage> result = new ArrayList<>();
        for (Relation r : relations) {
            result.add(toMessage(r));
        }
        return result;
    }

    @ActionMethod(FateCmd.getFateMap)
    public String getFateMap(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Map<String, Object> fateMap = fateService.buildFateMapData(userId);
        return JSON.toJSONString(fateMap);
    }

    @ActionMethod(FateCmd.applyChoice)
    public RelationMessage applyChoice(FateChoiceRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Relation relation = fateService.applyChoice(userId, request.npcId,
                request.worldIndex, request.fateDelta, request.trustDelta);
        return toMessage(relation);
    }

    @ActionMethod(FateCmd.getNpcRelation)
    public RelationMessage getNpcRelation(String npcId, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Relation relation = fateService.getOrCreate(userId, npcId, 1);
        return toMessage(relation);
    }

    @ActionMethod(FateCmd.getTopRelations)
    public List<RelationMessage> getTopRelations(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<Relation> top = fateService.getTopRelations(userId, 10);
        List<RelationMessage> result = new ArrayList<>();
        for (Relation r : top) {
            result.add(toMessage(r));
        }
        return result;
    }

    private RelationMessage toMessage(Relation relation) {
        RelationMessage msg = new RelationMessage();
        msg.relationId = relation.getId();
        msg.playerId = relation.getPlayerId();
        msg.npcId = relation.getNpcId();
        msg.npcName = relation.getNpcName() != null ? relation.getNpcName() : "";
        msg.worldIndex = relation.getWorldIndex();
        msg.fateScore = relation.getFateScore();
        msg.trustScore = relation.getTrustScore();
        msg.lastEmotion = relation.getLastEmotion() != null ? relation.getLastEmotion() : "neutral";
        msg.imageUrl = relation.getImageUrl() != null ? relation.getImageUrl() : "";
        msg.keyFacts = relation.getKeyFacts() != null ? JSON.toJSONString(relation.getKeyFacts()) : "[]";
        msg.lastInteractTime = relation.getUpdatedAt();
        return msg;
    }
}
