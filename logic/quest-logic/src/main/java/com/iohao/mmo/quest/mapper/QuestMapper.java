package com.iohao.mmo.quest.mapper;

import com.iohao.mmo.quest.entity.Quest;
import com.iohao.mmo.quest.entity.QuestReward;
import com.iohao.mmo.quest.proto.QuestMessage;
import com.iohao.mmo.quest.proto.QuestRewardMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper
public interface QuestMapper {
    QuestMapper ME = Mappers.getMapper(QuestMapper.class);
    
    @Mapping(target = "questType", expression = "java(quest.getQuestType().getCode())")
    @Mapping(target = "status", expression = "java(quest.getStatus().getCode())")
    QuestMessage convert(Quest quest);
    
    List<QuestMessage> convertList(List<Quest> quests);
    
    @Mapping(target = "rewardType", expression = "java(reward.getRewardType().getCode())")
    QuestRewardMessage convertReward(QuestReward reward);
    
    List<QuestRewardMessage> convertRewards(List<QuestReward> rewards);
}

