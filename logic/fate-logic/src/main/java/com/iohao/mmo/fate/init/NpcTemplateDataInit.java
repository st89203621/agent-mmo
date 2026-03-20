package com.iohao.mmo.fate.init;

import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.repository.NpcTemplateRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class NpcTemplateDataInit {

    @Resource
    NpcTemplateRepository npcTemplateRepository;

    @PostConstruct
    public void init() {
        if (npcTemplateRepository.count() > 0) {
            log.info("NPC模板数据已存在，跳过初始化");
            return;
        }

        log.info("开始初始化NPC模板数据...");

        List<NpcTemplate> templates = new ArrayList<>();
        templates.add(createNpc("npc_yunshang", "云裳", "book_zhuxian", "诛仙",
                "温柔内敛，心思细腻，对道友怀有关怀，言语间有古朴仙气", "青云门侍女", "calm"));
        templates.add(createNpc("npc_biyao", "碧瑶", "book_zhuxian", "诛仙",
                "傲娇深情，表面冷淡内心热烈，鬼王宗少主气场强大", "鬼王宗少主", "proud"));
        templates.add(createNpc("npc_xiaofan", "张小凡", "book_zhuxian", "诛仙",
                "憨厚真诚，草庙村出身，修炼混元珠，内心坚韧", "草庙村少年", "sincere"));
        templates.add(createNpc("npc_hanli", "韩立", "book_fanren", "凡人修仙传",
                "沉稳低调，行事谨慎，从不轻易相信他人，以实力说话", "散修", "calm"));
        templates.add(createNpc("npc_xiaoyan", "萧炎", "book_doupa", "斗破苍穹",
                "热血好强，不服输，曾是云岚宗废柴少主，胸怀大志", "云岚宗废柴少主", "passionate"));
        templates.add(createNpc("npc_shihao", "石昊", "book_wanmei", "完美世界",
                "古朴神秘，石村少年，拥有上古血脉，命运深重", "石村少年", "mysterious"));

        npcTemplateRepository.saveAll(templates);
        log.info("NPC模板初始化完成，共 {} 个NPC", templates.size());
    }

    private NpcTemplate createNpc(String npcId, String npcName, String bookWorldId, String bookTitle,
                                   String personality, String role, String emotion) {
        NpcTemplate template = new NpcTemplate();
        template.setId(npcId);
        template.setNpcId(npcId);
        template.setNpcName(npcName);
        template.setBookWorldId(bookWorldId);
        template.setBookTitle(bookTitle);
        template.setPersonality(personality);
        template.setRole(role);
        template.setEmotion(emotion);
        template.setPortraitBase("assets/npc/" + npcId + "/base.png");

        Map<String, String> personas = new HashMap<>();
        personas.put("calm", "assets/npc/" + npcId + "/calm.png");
        personas.put("happy", "assets/npc/" + npcId + "/happy.png");
        personas.put("sad", "assets/npc/" + npcId + "/sad.png");
        template.setPersonas(personas);

        return template;
    }
}
