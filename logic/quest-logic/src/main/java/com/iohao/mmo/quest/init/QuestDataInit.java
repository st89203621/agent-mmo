package com.iohao.mmo.quest.init;

import com.iohao.mmo.quest.entity.Quest;
import com.iohao.mmo.quest.entity.QuestReward;
import com.iohao.mmo.quest.entity.QuestTemplate;
import com.iohao.mmo.quest.repository.QuestTemplateRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class QuestDataInit {
    @Resource
    QuestTemplateRepository questTemplateRepository;
    
    @PostConstruct
    public void init() {
        if (questTemplateRepository.count() > 0) {
            log.info("任务模板已存在，跳过初始化");
            return;
        }
        
        log.info("开始初始化任务模板数据...");
        
        List<QuestTemplate> templates = new ArrayList<>();
        
        templates.add(createMainQuest001());
        templates.add(createMainQuest002());
        templates.add(createMasterQuest001());
        templates.add(createRegionQuest001());
        templates.add(createScrollQuest001());
        templates.add(createMaterialQuest001());
        
        questTemplateRepository.saveAll(templates);
        
        log.info("任务模板初始化完成，共 {} 个任务", templates.size());
    }
    
    private QuestTemplate createMainQuest001() {
        QuestTemplate template = new QuestTemplate();
        template.setQuestId("main_001");
        template.setQuestName("新手的第一步");
        template.setDescription("击败10只史莱姆，证明你的实力");
        template.setQuestType(Quest.QuestType.MAIN);
        template.setTargetProgress(10);
        template.setRequiredLevel(1);
        template.setNpcId("elder");
        template.setTimeLimit(0);
        
        List<QuestReward> rewards = new ArrayList<>();
        
        QuestReward expReward = new QuestReward();
        expReward.setRewardType(QuestReward.RewardType.EXP);
        expReward.setExp(100);
        rewards.add(expReward);
        
        QuestReward goldReward = new QuestReward();
        goldReward.setRewardType(QuestReward.RewardType.GOLD);
        goldReward.setGold(50);
        rewards.add(goldReward);
        
        template.setRewards(rewards);
        return template;
    }
    
    private QuestTemplate createMainQuest002() {
        QuestTemplate template = new QuestTemplate();
        template.setQuestId("main_002");
        template.setQuestName("村庄的危机");
        template.setDescription("保护村民免受怪物袭击，击败20只怪物");
        template.setQuestType(Quest.QuestType.MAIN);
        template.setTargetProgress(20);
        template.setRequiredLevel(5);
        template.setNpcId("guard1");
        template.setTimeLimit(0);
        template.setPreQuestId("main_001");
        
        List<QuestReward> rewards = new ArrayList<>();
        
        QuestReward expReward = new QuestReward();
        expReward.setRewardType(QuestReward.RewardType.EXP);
        expReward.setExp(500);
        rewards.add(expReward);
        
        QuestReward goldReward = new QuestReward();
        goldReward.setRewardType(QuestReward.RewardType.GOLD);
        goldReward.setGold(200);
        rewards.add(goldReward);
        
        QuestReward itemReward = new QuestReward();
        itemReward.setRewardType(QuestReward.RewardType.ITEM);
        itemReward.setItemId("sword_001");
        itemReward.setQuantity(1);
        rewards.add(itemReward);
        
        template.setRewards(rewards);
        return template;
    }
    
    private QuestTemplate createMasterQuest001() {
        QuestTemplate template = new QuestTemplate();
        template.setQuestId("master_001");
        template.setQuestName("师门修行");
        template.setDescription("完成师父布置的修炼任务，学习战斗技能");
        template.setQuestType(Quest.QuestType.MASTER);
        template.setTargetProgress(1);
        template.setRequiredLevel(10);
        template.setNpcId("master");
        template.setTimeLimit(0);
        
        List<QuestReward> rewards = new ArrayList<>();
        
        QuestReward expReward = new QuestReward();
        expReward.setRewardType(QuestReward.RewardType.EXP);
        expReward.setExp(1000);
        rewards.add(expReward);
        
        QuestReward skillReward = new QuestReward();
        skillReward.setRewardType(QuestReward.RewardType.SKILL);
        skillReward.setItemId("skill_fireball");
        rewards.add(skillReward);
        
        template.setRewards(rewards);
        return template;
    }
    
    private QuestTemplate createRegionQuest001() {
        QuestTemplate template = new QuestTemplate();
        template.setQuestId("region_001");
        template.setQuestName("村庄巡逻");
        template.setDescription("在村庄周围巡逻，确保安全");
        template.setQuestType(Quest.QuestType.REGION);
        template.setTargetProgress(5);
        template.setRequiredLevel(3);
        template.setNpcId("guard1");
        template.setTimeLimit(0);
        
        List<QuestReward> rewards = new ArrayList<>();
        
        QuestReward expReward = new QuestReward();
        expReward.setRewardType(QuestReward.RewardType.EXP);
        expReward.setExp(200);
        rewards.add(expReward);
        
        QuestReward goldReward = new QuestReward();
        goldReward.setRewardType(QuestReward.RewardType.GOLD);
        goldReward.setGold(100);
        rewards.add(goldReward);
        
        template.setRewards(rewards);
        return template;
    }
    
    private QuestTemplate createScrollQuest001() {
        QuestTemplate template = new QuestTemplate();
        template.setQuestId("scroll_001");
        template.setQuestName("练级卷轴");
        template.setDescription("击败任意怪物获得经验，限时1小时");
        template.setQuestType(Quest.QuestType.SCROLL);
        template.setTargetProgress(50);
        template.setRequiredLevel(1);
        template.setNpcId("elder");
        template.setTimeLimit(3600);
        
        List<QuestReward> rewards = new ArrayList<>();
        
        QuestReward expReward = new QuestReward();
        expReward.setRewardType(QuestReward.RewardType.EXP);
        expReward.setExp(2000);
        rewards.add(expReward);
        
        template.setRewards(rewards);
        return template;
    }
    
    private QuestTemplate createMaterialQuest001() {
        QuestTemplate template = new QuestTemplate();
        template.setQuestId("material_001");
        template.setQuestName("收集草药");
        template.setDescription("收集10个草药用于制作药水");
        template.setQuestType(Quest.QuestType.MATERIAL);
        template.setTargetProgress(10);
        template.setRequiredLevel(1);
        template.setNpcId("elder");
        template.setTimeLimit(0);
        
        List<QuestReward> rewards = new ArrayList<>();
        
        QuestReward expReward = new QuestReward();
        expReward.setRewardType(QuestReward.RewardType.EXP);
        expReward.setExp(150);
        rewards.add(expReward);
        
        QuestReward goldReward = new QuestReward();
        goldReward.setRewardType(QuestReward.RewardType.GOLD);
        goldReward.setGold(80);
        rewards.add(goldReward);
        
        QuestReward itemReward = new QuestReward();
        itemReward.setRewardType(QuestReward.RewardType.ITEM);
        itemReward.setItemId("potion_hp");
        itemReward.setQuantity(3);
        rewards.add(itemReward);
        
        template.setRewards(rewards);
        return template;
    }
}

