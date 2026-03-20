package com.iohao.mmo.quest.service;

import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.bag.client.BagExchange;
import com.iohao.mmo.bag.proto.BagItemMessage;
import com.iohao.mmo.level.client.LevelExchange;
import com.iohao.mmo.level.proto.ExpMessage;
import com.iohao.mmo.quest.entity.Quest;
import com.iohao.mmo.quest.entity.QuestReward;
import com.iohao.mmo.quest.entity.QuestTemplate;
import com.iohao.mmo.quest.repository.QuestRepository;
import com.iohao.mmo.quest.repository.QuestTemplateRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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

        long userId = flowContext.getUserId();
        int totalExp = 0;
        List<BagItemMessage> itemsToAdd = new ArrayList<>();

        for (QuestReward reward : quest.getRewards()) {
            switch (reward.getRewardType()) {
                case EXP -> totalExp += reward.getExp();
                case GOLD -> {
                    // 金币作为可叠加物品存入背包，itemTypeId="gold"
                    BagItemMessage gold = new BagItemMessage();
                    gold.id = "gold";
                    gold.itemTypeId = "gold";
                    gold.quantity = reward.getGold();
                    itemsToAdd.add(gold);
                }
                case ITEM -> {
                    BagItemMessage item = new BagItemMessage();
                    item.id = reward.getItemId();
                    item.itemTypeId = reward.getItemId();
                    item.quantity = reward.getQuantity();
                    itemsToAdd.add(item);
                }
                case SKILL -> log.info("奖励技能（暂未实现技能系统）: userId={}, skill={}", userId, reward.getItemId());
            }
        }

        // 发放经验
        if (totalExp > 0) {
            ExpMessage expMessage = new ExpMessage();
            expMessage.id = userId;
            expMessage.exp = totalExp;
            LevelExchange.addExpPerson(expMessage, flowContext);
            log.info("任务奖励经验: userId={}, exp={}", userId, totalExp);
        }

        // 发放物品
        if (!itemsToAdd.isEmpty()) {
            BagExchange.incrementItems(itemsToAdd, flowContext);
            log.info("任务奖励物品: userId={}, items={}", userId, itemsToAdd.size());
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

