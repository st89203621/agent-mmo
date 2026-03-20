package com.iohao.mmo.fate.service;

import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.entity.Relation;
import com.iohao.mmo.fate.repository.NpcTemplateRepository;
import com.iohao.mmo.fate.repository.RelationRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class FateService {

    @Resource
    RelationRepository relationRepository;

    @Resource
    NpcTemplateRepository npcTemplateRepository;

    public Relation getOrCreate(long playerId, String npcId, int worldIndex) {
        Optional<Relation> existing = relationRepository
                .findByPlayerIdAndNpcIdAndWorldIndex(playerId, npcId, worldIndex);
        if (existing.isPresent()) {
            return existing.get();
        }

        Relation relation = new Relation();
        relation.setId(UUID.randomUUID().toString());
        relation.setPlayerId(playerId);
        relation.setNpcId(npcId);
        relation.setWorldIndex(worldIndex);
        relation.setFateScore(0);
        relation.setTrustScore(0);
        relation.setLastEmotion("neutral");
        relation.setUpdatedAt(System.currentTimeMillis());
        relation.setDecayEnabled(true);
        relation.setKeyFacts(new ArrayList<>());

        // 填充NPC信息
        npcTemplateRepository.findByNpcId(npcId).ifPresent(template -> {
            relation.setNpcName(template.getNpcName());
            relation.setImageUrl(template.getPortraitBase());
            relation.setLastEmotion(template.getEmotion() != null ? template.getEmotion() : "neutral");
        });

        return relationRepository.save(relation);
    }

    public List<Relation> getRelations(long playerId) {
        return relationRepository.findByPlayerId(playerId);
    }

    public Relation applyChoice(long playerId, String npcId, int worldIndex, int fateDelta, int trustDelta) {
        Relation relation = getOrCreate(playerId, npcId, worldIndex);
        int prevFate = relation.getFateScore();
        relation.addFateScore(fateDelta);
        relation.addTrustScore(trustDelta);
        relation.setUpdatedAt(System.currentTimeMillis());

        int milestone = relation.isAtMilestone();
        if (milestone > 0 && prevFate < milestone) {
            log.info("玩家 {} 与NPC {} 缘分达到里程碑 {}", playerId, npcId, milestone);
        }

        return relationRepository.save(relation);
    }

    public void applyDecayAll(long playerId) {
        List<Relation> relations = relationRepository.findByPlayerId(playerId);
        for (Relation relation : relations) {
            relation.applyDecay();
        }
        relationRepository.saveAll(relations);
    }

    public List<Relation> getTopRelations(long playerId, int limit) {
        List<Relation> all = relationRepository.findByPlayerIdOrderByFateScoreDesc(playerId);
        return all.stream().limit(limit).toList();
    }

    public int getMilestoneStatus(Relation relation) {
        return relation.isAtMilestone();
    }

    public Map<String, Object> buildFateMapData(long playerId) {
        List<Relation> relations = getRelations(playerId);
        Map<String, Object> fateMap = new HashMap<>();
        List<Map<String, Object>> nodes = new ArrayList<>();

        for (Relation relation : relations) {
            Map<String, Object> node = new HashMap<>();
            node.put("npcId", relation.getNpcId());
            node.put("npcName", relation.getNpcName());
            node.put("fateScore", relation.getFateScore());
            node.put("trustScore", relation.getTrustScore());
            node.put("worldIndex", relation.getWorldIndex());
            node.put("emotion", relation.getLastEmotion());
            node.put("imageUrl", relation.getImageUrl());
            node.put("milestone", relation.isAtMilestone());
            nodes.add(node);
        }

        fateMap.put("playerId", playerId);
        fateMap.put("nodes", nodes);
        fateMap.put("totalNpcs", nodes.size());
        return fateMap;
    }

    public Optional<NpcTemplate> getNpcTemplate(String npcId) {
        return npcTemplateRepository.findByNpcId(npcId);
    }
}
