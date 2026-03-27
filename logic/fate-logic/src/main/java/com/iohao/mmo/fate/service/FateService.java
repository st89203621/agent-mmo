package com.iohao.mmo.fate.service;

import com.iohao.mmo.fate.entity.GlobalFate;
import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.entity.Relation;
import com.iohao.mmo.fate.repository.GlobalFateRepository;
import com.iohao.mmo.fate.repository.NpcTemplateRepository;
import com.iohao.mmo.fate.repository.RelationRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
public class FateService {

    @Resource
    RelationRepository relationRepository;

    @Resource
    NpcTemplateRepository npcTemplateRepository;

    @Resource
    GlobalFateRepository globalFateRepository;

    public Relation getOrCreate(long playerId, String npcId, int worldIndex) {
        List<Relation> existing = relationRepository
                .findByPlayerIdAndNpcIdAndWorldIndex(playerId, npcId, worldIndex);
        if (!existing.isEmpty()) {
            return existing.get(0);
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
        List<NpcTemplate> npcList = npcTemplateRepository.findByNpcId(npcId);
        if (!npcList.isEmpty()) {
            NpcTemplate template = npcList.get(0);
            relation.setNpcName(template.getNpcName());
            relation.setImageUrl(template.getPortraitBase());
            relation.setLastEmotion(template.getEmotion() != null ? template.getEmotion() : "neutral");
        }

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
        return npcTemplateRepository.findByNpcId(npcId).stream().findFirst();
    }

    // ============ 全局缘值/信值 ============

    public GlobalFate getOrCreateGlobalFate(long playerId) {
        return globalFateRepository.findById(playerId).orElseGet(() -> {
            GlobalFate gf = new GlobalFate();
            gf.setPlayerId(playerId);
            return globalFateRepository.save(gf);
        });
    }

    public GlobalFate getGlobalFate(long playerId) {
        return getOrCreateGlobalFate(playerId);
    }

    /** 增加全局缘值（来源：对话、交易、探索、组队等） */
    public GlobalFate addGlobalFate(long playerId, int fateDelta, int trustDelta) {
        GlobalFate gf = getOrCreateGlobalFate(playerId);
        gf.addCurrentFate(fateDelta);
        gf.addCurrentTrust(trustDelta);
        return globalFateRepository.save(gf);
    }

    /** 消耗缘值（浇花、解锁记忆等） */
    public boolean consumeFate(long playerId, int amount) {
        GlobalFate gf = getOrCreateGlobalFate(playerId);
        if (gf.getCurrentFate() < amount) return false;
        gf.addCurrentFate(-amount);
        return globalFateRepository.save(gf) != null;
    }

    /** 消耗信值（锻造信物等） */
    public boolean consumeTrust(long playerId, int amount) {
        GlobalFate gf = getOrCreateGlobalFate(playerId);
        if (gf.getCurrentTrust() < amount) return false;
        gf.addCurrentTrust(-amount);
        return globalFateRepository.save(gf) != null;
    }

    /** 轮回结算 */
    public GlobalFate archiveWorld(long playerId) {
        GlobalFate gf = getOrCreateGlobalFate(playerId);
        gf.archiveAndReset();
        return globalFateRepository.save(gf);
    }

    /**
     * 联动：NPC关系变化时同步增加全局缘值
     */
    public Relation applyChoiceWithGlobal(long playerId, String npcId, int worldIndex, int fateDelta, int trustDelta) {
        Relation relation = applyChoice(playerId, npcId, worldIndex, fateDelta, trustDelta);
        // NPC互动同步到全局（折算：NPC缘值变动的一半注入全局池）
        int globalFateDelta = Math.max(0, fateDelta / 2);
        int globalTrustDelta = Math.max(0, trustDelta / 2);
        if (globalFateDelta > 0 || globalTrustDelta > 0) {
            addGlobalFate(playerId, globalFateDelta, globalTrustDelta);
        }
        return relation;
    }
}
