package com.iohao.mmo.story.repository;

import com.iohao.mmo.story.entity.DialogueSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DialogueSessionRepository extends MongoRepository<DialogueSession, String> {
    List<DialogueSession> findByPlayerIdAndActiveTrue(long playerId);

    /** 查找玩家与某NPC在某世界的最近一次对话（按开始时间倒序） */
    List<DialogueSession> findByPlayerIdAndNpcIdAndWorldIndexOrderByStartTimeDesc(long playerId, String npcId, int worldIndex);
}
