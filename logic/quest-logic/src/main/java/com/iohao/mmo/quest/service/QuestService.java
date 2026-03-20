package com.iohao.mmo.quest.service;

import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.quest.entity.Quest;
import com.iohao.mmo.quest.entity.QuestReward;
import com.iohao.mmo.quest.entity.QuestTemplate;
import com.iohao.mmo.quest.repository.QuestRepository;
import com.iohao.mmo.quest.repository.QuestTemplateRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Slf4j
@Service
public class QuestService {
    @Resource
    QuestRepository questRepository;
    
    @Resource
    QuestTemplateRepository questTemplateRepository;
    
    public List<Quest> listQuest(long userId) {
        return questRepository.findByUserId(userId);
    }
    
    public List<Quest> listAcceptedQuest(long userId) {
        return questRepository.findByUserIdAndStatus(userId, Quest.QuestStatus.ACCEPTED);
    }
    
    public Quest acceptQuest(long userId, String questId) {
        Quest existQuest = questRepository.findByUserIdAndQuestId(userId, questId);
        if (Objects.nonNull(existQuest)) {
            return existQuest;
        }
        
        QuestTemplate template = questTemplateRepository.findById(questId).orElse(null);
        if (Objects.isNull(template)) {
            return null;
        }
        
        Quest quest = template.createQuest(userId);
        quest.setStatus(Quest.QuestStatus.ACCEPTED);
        quest.setAcceptTime(System.currentTimeMillis());
        
        return questRepository.save(quest);
    }
    
    public Quest updateProgress(long userId, String questId, int progress) {
        Quest quest = questRepository.findByUserIdAndQuestId(userId, questId);
        if (Objects.isNull(quest)) {
            return null;
        }
        
        quest.updateProgress(progress);
        return questRepository.save(quest);
    }
    
    public Quest completeQuest(long userId, String questId, FlowContext flowContext) {
        Quest quest = questRepository.findByUserIdAndQuestId(userId, questId);
        if (Objects.isNull(quest) || quest.getStatus() != Quest.QuestStatus.COMPLETED) {
            return null;
        }
        
        giveRewards(quest, flowContext);
        
        quest.setStatus(Quest.QuestStatus.REWARDED);
        return questRepository.save(quest);
    }
    
    private void giveRewards(Quest quest, FlowContext flowContext) {
        if (Objects.isNull(quest.getRewards())) {
            return;
        }
        
        for (QuestReward reward : quest.getRewards()) {
            switch (reward.getRewardType()) {
                case EXP -> log.info("奖励经验: {}", reward.getExp());
                case GOLD -> log.info("奖励金币: {}", reward.getGold());
                case ITEM -> log.info("奖励道具: {} x{}", reward.getItemId(), reward.getQuantity());
                case SKILL -> log.info("奖励技能: {}", reward.getItemId());
            }
        }
    }
    
    public Quest abandonQuest(long userId, String questId) {
        Quest quest = questRepository.findByUserIdAndQuestId(userId, questId);
        if (Objects.isNull(quest)) {
            return null;
        }
        
        quest.setStatus(Quest.QuestStatus.ABANDONED);
        return questRepository.save(quest);
    }
    
    public List<QuestTemplate> listAvailableQuest(long userId, int userLevel) {
        return questTemplateRepository.findAll().stream()
            .filter(t -> t.getRequiredLevel() <= userLevel)
            .toList();
    }
}

