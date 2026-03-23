package com.iohao.mmo.fate.init;

import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.repository.NpcTemplateRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
public class NpcTemplateDataInit {

    @Resource
    NpcTemplateRepository npcTemplateRepository;

    @PostConstruct
    public void init() {
        // 增量初始化：按npcId去重，只添加缺失的NPC
        Set<String> existingIds = npcTemplateRepository.findAll().stream()
                .map(NpcTemplate::getNpcId).collect(Collectors.toSet());

        List<NpcTemplate> toAdd = allNpcs().stream()
                .filter(n -> !existingIds.contains(n.getNpcId()))
                .toList();

        if (toAdd.isEmpty()) {
            log.info("NPC模板数据已完整（{}个），跳过初始化", existingIds.size());
            return;
        }

        npcTemplateRepository.saveAll(toAdd);
        log.info("NPC模板初始化完成：新增{}个，总计{}个", toAdd.size(), existingIds.size() + toAdd.size());
    }

    private List<NpcTemplate> allNpcs() {
        List<NpcTemplate> list = new ArrayList<>();

        // ── 诛仙 ──
        list.add(npc("npc_yunshang", "云裳", "诛仙", "温柔内敛，心思细腻，对道友怀有关怀，言语间有古朴仙气", "青云门侍女", "calm"));
        list.add(npc("npc_biyao", "碧瑶", "诛仙", "傲娇深情，表面冷淡内心热烈，鬼王宗少主气场强大", "鬼王宗少主", "cold"));
        list.add(npc("npc_xiaofan", "张小凡", "诛仙", "憨厚真诚，草庙村出身，修炼混元珠，内心坚韧", "草庙村少年", "calm"));

        // ── 凡人修仙传 ──
        list.add(npc("npc_hanli", "韩立", "凡人修仙传", "沉稳低调，行事谨慎，从不轻易相信他人，以实力说话", "散修", "calm"));
        list.add(npc("npc_nangongwan", "南宫婉", "凡人修仙传", "聪慧温婉，掩月宗弟子，外柔内刚，对韩立情深不渝", "掩月宗弟子", "tender"));

        // ── 择天记 ──
        list.add(npc("npc_chenchangsheng", "陈长生", "择天记", "从容淡然，坚守本心，命运虽逆亦不退缩的少年", "国教学院院长", "calm"));
        list.add(npc("npc_xuyourong", "徐有容", "择天记", "冰雪聪明，圣女气质，外表冷若冰霜实则心思细腻", "南方圣女", "cold"));

        // ── 一念永恒 ──
        list.add(npc("npc_baixiaochun", "白小纯", "一念永恒", "贪生怕死却重情重义，天赋异禀，诙谐搞怪中藏着赤子之心", "灵溪宗弟子", "playful"));
        list.add(npc("npc_dulinger", "杜灵儿", "一念永恒", "灵动活泼，刁蛮可爱，与白小纯青梅竹马般的情谊", "灵溪宗仙子", "happy"));

        // ── 仙逆 ──
        list.add(npc("npc_wanglin", "王林", "仙逆", "性格冷峻，心思缜密，逆天修仙的执念让他从不言败", "散修行者", "cold"));
        list.add(npc("npc_limuwan", "李慕婉", "仙逆", "温柔善良，命运坎坷，对王林一片痴心，是他心底的柔软", "修仙世家之女", "tender"));

        // ── 三生三世十里桃花 ──
        list.add(npc("npc_baiqian", "白浅", "三生三世十里桃花", "九尾狐族帝姬，外表慵懒洒脱，实则情深义重", "青丘帝姬", "calm"));
        list.add(npc("npc_yehua", "夜华", "三生三世十里桃花", "天族太子，外冷内热，深沉内敛，为爱甘愿牺牲一切", "天族太子", "cold"));

        // ── 花千骨 ──
        list.add(npc("npc_huaqiangu", "花千骨", "花千骨", "纯真善良，天煞孤星之命，对师父白子画一往情深", "长留仙山弟子", "sad"));
        list.add(npc("npc_baizihua", "白子画", "花千骨", "冷若冰霜的长留上仙，克制隐忍，为大义压抑情感", "长留上仙", "cold"));

        // ── 将夜 ──
        list.add(npc("npc_ningque", "宁缺", "将夜", "市井出身，痞气十足却心怀正义，书院后山弟子", "书院十三先生", "determined"));
        list.add(npc("npc_sangsang", "桑桑", "将夜", "朴素勤劳的小侍女，陪伴宁缺走过一切，身份成谜", "宁缺的侍女", "calm"));

        // ── 大道朝天 ──
        list.add(npc("npc_jingyang", "井九", "大道朝天", "青山宗天才弟子，性格淡然如剑，追求大道至简", "青山宗弟子", "calm"));
        list.add(npc("npc_nanqiu", "南秋薄", "大道朝天", "冷艳绝尘的离山剑宗弟子，与井九亦敌亦友", "离山剑宗弟子", "cold"));

        // ── 道君 ──
        list.add(npc("npc_daojun", "楚阳", "道君", "悟道少年，心志坚定，在混沌中寻找自己的道", "问道少年", "determined"));
        list.add(npc("npc_daojun_f", "灵玉", "道君", "道门天才女修，聪慧而骄傲，对大道有独到领悟", "道门真传弟子", "calm"));

        // ── 斗破苍穹 ──
        list.add(npc("npc_xiaoyan", "萧炎", "斗破苍穹", "热血好强，不服输，曾是云岚宗废柴少主，胸怀大志", "云岚宗废柴少主", "determined"));
        list.add(npc("npc_xiaoxuner", "萧薰儿", "斗破苍穹", "绝美冷傲的古族后裔，从小与萧炎青梅竹马，默默守护", "古族千金", "tender"));

        // ── 完美世界 ──
        list.add(npc("npc_shihao", "石昊", "完美世界", "古朴神秘，石村少年，拥有上古血脉，命运深重", "石村少年", "calm"));
        list.add(npc("npc_qingyi", "清漪", "完美世界", "仙子风姿，温柔中带着坚韧，与石昊并肩作战", "天仙院弟子", "tender"));

        // ── 遮天 ──
        list.add(npc("npc_yefan", "叶凡", "遮天", "从地球穿越而来的普通青年，在修仙界逐渐觉醒成为至尊", "北域修士", "calm"));
        list.add(npc("npc_jiziyue", "姬紫月", "遮天", "姬家天才，美艳高傲，与叶凡纠葛不断的宿命对手", "姬家圣女", "cold"));

        // ── 斗罗大陆 ──
        list.add(npc("npc_tangsan", "唐三", "斗罗大陆", "唐门外门弟子转世，隐忍内敛，暗器术与武魂双修天才", "史莱克七怪之首", "calm"));
        list.add(npc("npc_xiaowu", "小舞", "斗罗大陆", "活泼开朗的十万年魂兽化形少女，与唐三两情相悦", "柔骨兔化形", "happy"));

        // ── 武动乾坤 ──
        list.add(npc("npc_lindong", "林动", "武动乾坤", "性格坚毅，从弱小家族走出的热血少年，获石符造化", "林家少年", "determined"));
        list.add(npc("npc_lingqingzhu", "绫清竹", "武动乾坤", "九天太清宫圣女，冰清玉洁，实力与美貌兼备", "九天太清宫圣女", "cold"));

        // ── 吞噬星空 ──
        list.add(npc("npc_luofeng", "罗峰", "吞噬星空", "意志坚定的地球武者，从灾变废墟中崛起的星际强者", "地球武者", "determined"));
        list.add(npc("npc_xuxin", "徐欣", "吞噬星空", "罗峰的青梅竹马妻子，温柔坚强，是他永远的牵挂", "罗峰之妻", "tender"));

        // ── 莽荒纪 ──
        list.add(npc("npc_jining", "纪宁", "莽荒纪", "转世重生于莽荒世界，剑道天赋绝顶，追寻亲人的执念", "纪氏少年", "calm"));
        list.add(npc("npc_yuwei", "余薇", "莽荒纪", "聪慧温婉的修仙世家女子，与纪宁患难与共", "修仙门派弟子", "tender"));

        // ── 盘龙 ──
        list.add(npc("npc_linlei", "林雷", "盘龙", "玉兰大陆巴鲁克家族后裔，龙血战士传人，性格沉稳坚毅", "巴鲁克家族后裔", "calm"));
        list.add(npc("npc_dier", "迪莉娅", "盘龙", "活泼善良的少女，与林雷两情相悦，是他一生的伴侣", "林雷之妻", "happy"));

        // ── 神墓 ──
        list.add(npc("npc_chennan", "辰南", "神墓", "万年前的绝世强者，复活后在陌生世界重新探索远古秘辛", "远古强者", "cold"));
        list.add(npc("npc_mingyue_sm", "明月", "神墓", "冷艳神秘的远古幸存者，与辰南有着跨越万年的纠葛", "远古修士", "melancholy"));

        // ── 星辰变 ──
        list.add(npc("npc_qinyu", "秦羽", "星辰变", "秦家三公子，体质无法修内功，以星辰之力走出独特修炼道路", "秦家三公子", "determined"));
        list.add(npc("npc_lier", "李儿", "星辰变", "剑仙城主之女，温柔娴静，与秦羽在修仙界结下深缘", "剑仙城主之女", "tender"));

        // ── 天龙八部 ──
        list.add(npc("npc_qiaofeng", "乔峰", "天龙八部", "豪迈刚烈，义薄云天，丐帮帮主却身世成谜，内心挣扎于契丹与汉人之间", "丐帮帮主", "determined"));
        list.add(npc("npc_wangyuyan", "王语嫣", "天龙八部", "博览群书的绝色女子，精通各派武学却不会武功，痴情又纯真", "曼陀山庄小姐", "calm"));
        list.add(npc("npc_duanyu", "段誉", "天龙八部", "大理国皇子，性格痴情憨直，误打误撞学会绝世武功", "大理国皇子", "happy"));

        // ── 射雕英雄传 ──
        list.add(npc("npc_guojing", "郭靖", "射雕英雄传", "忠厚老实，天资愚钝但勤学苦练，侠之大者为国为民", "蒙古长大的宋人", "calm"));
        list.add(npc("npc_huangrong", "黄蓉", "射雕英雄传", "冰雪聪明，古灵精怪，桃花岛主之女，厨艺与智谋兼备", "桃花岛主之女", "playful"));

        // ── 笑傲江湖 ──
        list.add(npc("npc_linghuchong", "令狐冲", "笑傲江湖", "潇洒不羁，嗜酒如命，剑术天才却不拘礼法", "华山派大弟子", "playful"));
        list.add(npc("npc_renyingying", "任盈盈", "笑傲江湖", "温柔坚定的日月神教圣姑，精通音律，为爱无惧世俗偏见", "日月神教圣姑", "tender"));

        // ── 神雕侠侣 ──
        list.add(npc("npc_yangguo", "杨过", "神雕侠侣", "亦正亦邪的少年侠客，聪明绝顶，深情执着", "神雕大侠", "determined"));
        list.add(npc("npc_xiaolongnv", "小龙女", "神雕侠侣", "清冷出尘如仙子，不谙世事却对杨过一往情深", "古墓派传人", "cold"));

        // ── 雪中悍刀行 ──
        list.add(npc("npc_xufengnian", "徐凤年", "雪中悍刀行", "北凉王世子，三年游历脱胎换骨，嬉笑怒骂间藏着帝王心术", "北凉王世子", "playful"));
        list.add(npc("npc_jiangni", "姜泥", "雪中悍刀行", "亡国公主，性格刚烈，满心仇恨下藏着少女的柔软", "大楚亡国公主", "angry"));

        // ── 剑来 ──
        list.add(npc("npc_chenpingan", "陈平安", "剑来", "泥瓶巷出身的草根少年，讲规矩重道理，为守护而问剑天下", "落魄少年", "calm"));
        list.add(npc("npc_ningyao", "宁姚", "剑来", "剑气长城天才女剑修，性格直率霸气，实力冠绝同辈", "剑气长城女剑修", "cold"));

        // ── 庆余年 ──
        list.add(npc("npc_fanxian", "范闲", "庆余年", "穿越者灵魂，以现代思维在权谋漩涡中游刃有余，诗才无双", "庆国户部侍郎之子", "playful"));
        list.add(npc("npc_linwaner", "林婉儿", "庆余年", "长公主之女，看似柔弱实则聪慧坚韧的才女", "庆国长公主之女", "shy"));

        // ── 大奉打更人 ──
        list.add(npc("npc_xuqian", "许七安", "大奉打更人", "穿越到大奉王朝的现代灵魂，机智幽默，以智慧和武力探案升级", "大奉铜锣", "playful"));
        list.add(npc("npc_huaiqing", "怀庆公主", "大奉打更人", "冷面如霜的皇家公主，心思缜密，是许七安最信赖的盟友", "大奉公主", "cold"));

        // ── 琅琊榜 ──
        list.add(npc("npc_meichangsu", "梅长苏", "琅琊榜", "琅琊榜首，化名苏哲入京复仇，病弱之躯下是惊天的智谋与深沉的情义", "江左梅郎", "calm"));
        list.add(npc("npc_nihuang", "霓凰", "琅琊榜", "南境穆王府郡主，英姿飒爽的女将军，十年如一日等待故人归来", "穆王府郡主", "determined"));

        // ── 长安十二时辰 ──
        list.add(npc("npc_zhangxiaojing", "张小敬", "长安十二时辰", "死囚出身的不良帅，独眼沧桑，为守护长安百姓不惜一切", "不良帅", "determined"));
        list.add(npc("npc_tanqi", "檀棋", "长安十二时辰", "李必的婢女，聪慧果断，在危机中展现过人胆识", "靖安司婢女", "calm"));

        // ── 赘婿 ──
        list.add(npc("npc_ningyi", "宁毅", "赘婿", "穿越而来的商业天才，表面平和实则心机深沉，以经济手段改变时代", "苏家赘婿", "calm"));
        list.add(npc("npc_sutaner", "苏檀儿", "赘婿", "苏家当家大小姐，精明能干，从轻视赘婿到逐渐欣赏依赖", "苏家大小姐", "determined"));

        // ── 三体 ──
        list.add(npc("npc_luoji", "罗辑", "三体", "大学教授，意外成为面壁者，在宇宙尺度的博弈中守护地球", "面壁者", "calm"));
        list.add(npc("npc_chengxin", "程心", "三体", "航天工程师，充满理想主义的执剑人，在残酷宇宙中坚守人性", "执剑人", "tender"));

        // ── 全职高手 ──
        list.add(npc("npc_yexiu", "叶修", "全职高手", "荣耀第一人，被俱乐部驱逐后在网吧重新开始，淡然从容的电竞之神", "荣耀前职业选手", "calm"));
        list.add(npc("npc_sumucheng", "苏沐橙", "全职高手", "顶级射手职业选手，阳光开朗，是叶修最亲密的搭档与伙伴", "荣耀职业选手", "happy"));

        return list;
    }

    private NpcTemplate npc(String npcId, String npcName, String bookTitle,
                            String personality, String role, String emotion) {
        NpcTemplate t = new NpcTemplate();
        t.setId(npcId);
        t.setNpcId(npcId);
        t.setNpcName(npcName);
        t.setBookWorldId("book_" + npcId.replace("npc_", ""));
        t.setBookTitle(bookTitle);
        t.setPersonality(personality);
        t.setRole(role);
        t.setEmotion(emotion);
        t.setPortraitBase("assets/npc/" + npcId + "/base.png");

        Map<String, String> personas = new HashMap<>();
        personas.put("calm", "assets/npc/" + npcId + "/calm.png");
        personas.put("happy", "assets/npc/" + npcId + "/happy.png");
        personas.put("sad", "assets/npc/" + npcId + "/sad.png");
        t.setPersonas(personas);

        return t;
    }
}
