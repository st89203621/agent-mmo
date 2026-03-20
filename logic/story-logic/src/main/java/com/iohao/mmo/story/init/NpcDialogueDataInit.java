package com.iohao.mmo.story.init;

import com.iohao.mmo.story.entity.NpcDialogueTemplate;
import com.iohao.mmo.story.entity.NpcDialogueTemplate.Choice;
import com.iohao.mmo.story.entity.NpcDialogueTemplate.DialogueLine;
import com.iohao.mmo.story.repository.NpcDialogueTemplateRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class NpcDialogueDataInit {

    @Resource
    NpcDialogueTemplateRepository npcDialogueTemplateRepository;

    @PostConstruct
    public void init() {
        if (npcDialogueTemplateRepository.count() > 0) {
            log.info("NPC对话模板已存在，跳过初始化");
            return;
        }

        log.info("开始初始化NPC对话模板...");

        List<NpcDialogueTemplate> templates = new ArrayList<>();
        templates.add(createYunshangInitTemplate());
        templates.add(createYunshangFate60Template());
        templates.add(createYunshangFate80Template());

        npcDialogueTemplateRepository.saveAll(templates);
        log.info("NPC对话模板初始化完成，共 {} 个模板", templates.size());
    }

    private NpcDialogueTemplate createYunshangInitTemplate() {
        NpcDialogueTemplate template = new NpcDialogueTemplate();
        template.setId("yunshang_init");
        template.setNpcId("npc_yunshang");
        template.setWorldIndex(1);
        template.setTriggerCondition("initial");

        List<DialogueLine> dialogues = new ArrayList<>();

        DialogueLine openLine = new DialogueLine();
        openLine.setLineId("line_open");
        openLine.setSpeaker("云裳");
        openLine.setEmotion("calm");
        openLine.setText("道友今日来此，可是为那件事？");

        List<Choice> choices = new ArrayList<>();

        Choice choice0 = new Choice();
        choice0.setId(0);
        choice0.setText("点头，默不作声");
        choice0.setFateDelta(1);
        choice0.setTrustDelta(1);
        choice0.setNextLineId("line_silent_reply");
        choices.add(choice0);

        Choice choice1 = new Choice();
        choice1.setId(1);
        choice1.setText("笑道：不过是路过，想见见你");
        choice1.setFateDelta(9);
        choice1.setTrustDelta(5);
        choice1.setNextLineId("line_smile_reply");
        choices.add(choice1);

        Choice choice2 = new Choice();
        choice2.setId(2);
        choice2.setText("反问：你又如何知晓？");
        choice2.setFateDelta(3);
        choice2.setTrustDelta(2);
        choice2.setNextLineId("line_question_reply");
        choices.add(choice2);

        openLine.setChoices(choices);
        dialogues.add(openLine);

        DialogueLine silentReply = new DialogueLine();
        silentReply.setLineId("line_silent_reply");
        silentReply.setSpeaker("云裳");
        silentReply.setEmotion("calm");
        silentReply.setText("（轻轻颔首）道友心事重重，若有需要，云裳愿倾听。");
        dialogues.add(silentReply);

        DialogueLine smileReply = new DialogueLine();
        smileReply.setLineId("line_smile_reply");
        smileReply.setSpeaker("云裳");
        smileReply.setEmotion("warm");
        smileReply.setText("（微微一怔，随后展颜）道友真是……想见便来，倒也坦率。");
        dialogues.add(smileReply);

        DialogueLine questionReply = new DialogueLine();
        questionReply.setLineId("line_question_reply");
        questionReply.setSpeaker("云裳");
        questionReply.setEmotion("curious");
        questionReply.setText("（眉梢微挑）云裳只是…有所感应。道友莫要多想。");
        dialogues.add(questionReply);

        template.setDialogues(dialogues);
        return template;
    }

    private NpcDialogueTemplate createYunshangFate60Template() {
        NpcDialogueTemplate template = new NpcDialogueTemplate();
        template.setId("yunshang_fate60");
        template.setNpcId("npc_yunshang");
        template.setWorldIndex(1);
        template.setTriggerCondition("fate_60");

        List<DialogueLine> dialogues = new ArrayList<>();

        DialogueLine line = new DialogueLine();
        line.setLineId("line_fate60");
        line.setSpeaker("云裳");
        line.setEmotion("warm");
        line.setText("你我之间，似有前缘...");
        dialogues.add(line);

        template.setDialogues(dialogues);
        return template;
    }

    private NpcDialogueTemplate createYunshangFate80Template() {
        NpcDialogueTemplate template = new NpcDialogueTemplate();
        template.setId("yunshang_fate80");
        template.setNpcId("npc_yunshang");
        template.setWorldIndex(1);
        template.setTriggerCondition("fate_80");

        List<DialogueLine> dialogues = new ArrayList<>();

        DialogueLine line = new DialogueLine();
        line.setLineId("line_fate80");
        line.setSpeaker("云裳");
        line.setEmotion("moved");
        line.setText("若有来生，望还能相遇...");
        dialogues.add(line);

        template.setDialogues(dialogues);
        return template;
    }
}
