package com.iohao.mmo.quest.repository;

import com.iohao.mmo.quest.entity.Quest;
import com.iohao.mmo.quest.entity.QuestTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface QuestTemplateRepository extends MongoRepository<QuestTemplate, String> {
    List<QuestTemplate> findByQuestType(Quest.QuestType questType);
}

