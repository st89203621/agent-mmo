package com.iohao.mmo.story.repository;

import com.iohao.mmo.story.entity.NpcDialogueTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface NpcDialogueTemplateRepository extends MongoRepository<NpcDialogueTemplate, String> {
    Optional<NpcDialogueTemplate> findByNpcIdAndTriggerCondition(String npcId, String triggerCondition);
    List<NpcDialogueTemplate> findByNpcId(String npcId);
}
