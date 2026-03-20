package com.iohao.mmo.quest.repository;

import com.iohao.mmo.quest.entity.Quest;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface QuestRepository extends MongoRepository<Quest, String> {
    List<Quest> findByUserId(long userId);
    List<Quest> findByUserIdAndStatus(long userId, Quest.QuestStatus status);
    Quest findByUserIdAndQuestId(long userId, String questId);
}

