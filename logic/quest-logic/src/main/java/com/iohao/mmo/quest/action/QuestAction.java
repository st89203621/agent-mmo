package com.iohao.mmo.quest.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.quest.cmd.QuestCmd;
import com.iohao.mmo.quest.entity.Quest;
import com.iohao.mmo.quest.mapper.QuestMapper;
import com.iohao.mmo.quest.proto.QuestMessage;
import com.iohao.mmo.quest.service.QuestService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@ActionController(QuestCmd.cmd)
public class QuestAction {
    @Resource
    QuestService questService;
    
    @ActionMethod(QuestCmd.listQuest)
    public List<QuestMessage> listQuest(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<Quest> quests = questService.listQuest(userId);
        return QuestMapper.ME.convertList(quests);
    }
    
    @ActionMethod(QuestCmd.acceptQuest)
    public QuestMessage acceptQuest(QuestMessage questMessage, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Quest quest = questService.acceptQuest(userId, questMessage.questId);
        return QuestMapper.ME.convert(quest);
    }
    
    @ActionMethod(QuestCmd.completeQuest)
    public QuestMessage completeQuest(QuestMessage questMessage, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Quest quest = questService.completeQuest(userId, questMessage.questId, flowContext);
        return QuestMapper.ME.convert(quest);
    }
    
    @ActionMethod(QuestCmd.abandonQuest)
    public QuestMessage abandonQuest(QuestMessage questMessage, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Quest quest = questService.abandonQuest(userId, questMessage.questId);
        return QuestMapper.ME.convert(quest);
    }
}

