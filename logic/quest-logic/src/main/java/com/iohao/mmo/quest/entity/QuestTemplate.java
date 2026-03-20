package com.iohao.mmo.quest.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuestTemplate {
    @Id
    String questId;
    
    String questName;
    String description;
    Quest.QuestType questType;
    
    int targetProgress;
    List<QuestReward> rewards;
    
    int requiredLevel;
    String npcId;
    int timeLimit;
    
    String preQuestId;
    
    public Quest createQuest(long userId) {
        Quest quest = new Quest();
        quest.setUserId(userId);
        quest.setQuestId(this.questId);
        quest.setQuestName(this.questName);
        quest.setDescription(this.description);
        quest.setQuestType(this.questType);
        quest.setStatus(Quest.QuestStatus.AVAILABLE);
        quest.setCurrentProgress(0);
        quest.setTargetProgress(this.targetProgress);
        quest.setRewards(this.rewards);
        quest.setRequiredLevel(this.requiredLevel);
        quest.setNpcId(this.npcId);
        quest.setTimeLimit(this.timeLimit);
        return quest;
    }
}

