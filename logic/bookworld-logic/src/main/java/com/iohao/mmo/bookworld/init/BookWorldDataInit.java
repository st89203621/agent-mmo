package com.iohao.mmo.bookworld.init;

import com.iohao.mmo.bookworld.entity.BookWorld;
import com.iohao.mmo.bookworld.repository.BookWorldRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

import static com.iohao.mmo.bookworld.entity.BookWorld.Category.*;

@Slf4j
@Component
public class BookWorldDataInit {

    @Resource
    BookWorldRepository bookWorldRepository;

    @PostConstruct
    public void init() {
        Map<String, BookWorld> existingMap = bookWorldRepository.findAll().stream()
                .collect(Collectors.toMap(BookWorld::getTitle, b -> b, (a, b) -> a));

        List<BookWorld> allDefined = allBooks();
        List<BookWorld> toSave = new ArrayList<>();
        int newCount = 0;
        int updateCount = 0;

        for (BookWorld defined : allDefined) {
            BookWorld existing = existingMap.get(defined.getTitle());
            if (existing == null) {
                toSave.add(defined);
                newCount++;
            } else if (needsUpdate(existing)) {
                // 保留原有ID，用最新数据覆盖
                defined.setId(existing.getId());
                toSave.add(defined);
                updateCount++;
            }
        }

        if (toSave.isEmpty()) {
            log.info("书籍世界数据已完整（{}本），跳过初始化", existingMap.size());
            return;
        }

        bookWorldRepository.saveAll(toSave);
        log.info("书籍世界初始化完成：新增{}本，更新{}本，总计{}本", newCount, updateCount, existingMap.size() + newCount);
    }

    private boolean needsUpdate(BookWorld existing) {
        return existing.getLoreSummary() == null || existing.getLoreSummary().isBlank()
                || existing.getArtStyle() == null || existing.getArtStyle().isBlank()
                || existing.getLanguageStyle() == null || existing.getLanguageStyle().isBlank()
                || existing.getThemeTag() == null || existing.getThemeTag().isBlank();
    }

    private List<BookWorld> allBooks() {
        List<BookWorld> books = new ArrayList<>();

        // ── 仙侠 XIANXIA ──
        books.add(book("诛仙", "萧鼎", XIANXIA,
                "青云山修仙世界，正邪之争，张小凡与碧瑶的缘分",
                "水墨仙侠风", "#1a1028,#c9a84c", "文言夹白话"));
        books.add(book("凡人修仙传", "忘语", XIANXIA,
                "修仙界韩立从散修到大能的传奇历程，重视资源积累",
                "古朴修仙风", "#101a10,#4aaa96", "平实叙述"));
        books.add(book("择天记", "猫腻", XIANXIA,
                "陈长生与教典，星宿命盘，命运与自由",
                "清冷仙道风", "#050510,#a0c0ff", "从容淡然"));
        books.add(book("一念永恒", "耳根", XIANXIA,
                "白小纯从灵溪宗到星空古殿的修仙之旅，性格憨厚贪生怕死却重情重义",
                "灵动仙宗风", "#1a1520,#c08040", "诙谐生动"));
        books.add(book("仙逆", "耳根", XIANXIA,
                "王林逆天修仙，从弱小少年到仙界至尊，命运多舛却从不屈服",
                "苍凉逆天风", "#0a0a10,#808090", "沉郁内敛"));
        books.add(book("三生三世十里桃花", "唐七公子", XIANXIA,
                "青丘帝姬白浅与天族太子夜华三世纠缠的绝美仙恋",
                "唯美仙恋风", "#1a0818,#ff8eae", "典雅浪漫"));
        books.add(book("花千骨", "Fresh果果", XIANXIA,
                "花千骨拜入长留仙山，与白子画师徒禁忌之恋",
                "清雅仙山风", "#0f1a10,#90d080", "清丽哀婉"));
        books.add(book("将夜", "猫腻", XIANXIA,
                "宁缺背负血仇入书院修行，与桑桑相依为命改写命运",
                "厚重书院风", "#101008,#d0b060", "沉稳大气"));
        books.add(book("大道朝天", "猫腻", XIANXIA,
                "青山宗少年与剑的羁绊，问道苍穹的仙侠传说",
                "青山剑道风", "#081018,#70a0c0", "飘逸洒脱"));
        books.add(book("道君", "跃千愁", XIANXIA,
                "少年悟道成君，在仙魔两界穿梭的修道传奇",
                "混沌道韵风", "#0a0810,#a090c0", "古朴深邃"));

        // ── 玄幻 XUANHUAN ──
        books.add(book("斗破苍穹", "天蚕土豆", XUANHUAN,
                "斗气大陆，萧炎从废柴到强者，丹道与斗技",
                "热血斗气风", "#1a1200,#c9a84c", "热血激昂"));
        books.add(book("完美世界", "辰东", XUANHUAN,
                "石昊的上古血脉之路，荒古传说与神话",
                "史诗神话风", "#000a1a,#6090d0", "宏大叙事"));
        books.add(book("遮天", "辰东", XUANHUAN,
                "叶凡从地球到神秘宇宙的极道之旅",
                "极道神秘风", "#1a0a00,#c9a84c", "深沉内敛"));
        books.add(book("斗罗大陆", "唐家三少", XUANHUAN,
                "唐三转生斗罗大陆，武魂觉醒，天斗帝国争霸",
                "武魂战技风", "#0a0a1a,#8050c0", "热血少年"));
        books.add(book("武动乾坤", "天蚕土豆", XUANHUAN,
                "林动获得神秘石符修炼元力，在乾坤大陆崛起的热血传奇",
                "符文乾坤风", "#10100a,#c0a030", "刚猛热血"));
        books.add(book("吞噬星空", "我吃西红柿", XUANHUAN,
                "地球灾变后的未来世界，罗峰从武者到宇宙级强者的星际征途",
                "未来星际风", "#000510,#4080ff", "硬朗明快"));
        books.add(book("莽荒纪", "我吃西红柿", XUANHUAN,
                "纪宁转世莽荒时代，在洪荒天地间证道的壮阔传奇",
                "洪荒莽苍风", "#0a1008,#80a060", "恢宏苍莽"));
        books.add(book("盘龙", "我吃西红柿", XUANHUAN,
                "林雷在玉兰大陆修炼龙血战士之力，纵横四大位面的冒险",
                "大陆冒险风", "#0a0810,#8070b0", "流畅明快"));
        books.add(book("神墓", "辰东", XUANHUAN,
                "辰南万年后复活，揭开远古神魔大战的真相",
                "远古神魔风", "#100808,#a06060", "苍茫悲壮"));
        books.add(book("星辰变", "我吃西红柿", XUANHUAN,
                "秦羽以星辰之力修炼，从凡人蜕变为掌控星辰的至尊",
                "星辰浩瀚风", "#050510,#6080e0", "奇幻瑰丽"));

        // ── 武侠 WUXIA ──
        books.add(book("天龙八部", "金庸", WUXIA,
                "乔峰、段誉、虚竹三兄弟的江湖恩怨与家国情仇",
                "经典武侠风", "#1a1008,#b09060", "古典叙事"));
        books.add(book("射雕英雄传", "金庸", WUXIA,
                "郭靖与黄蓉在南宋末年的江湖传奇，侠之大者为国为民",
                "大漠豪侠风", "#181008,#c09840", "豪迈质朴"));
        books.add(book("笑傲江湖", "金庸", WUXIA,
                "令狐冲与任盈盈超越正邪门派之见的自由爱情",
                "潇洒江湖风", "#0a1010,#70b0a0", "洒脱不羁"));
        books.add(book("神雕侠侣", "金庸", WUXIA,
                "杨过与小龙女十六年生死相守的绝世之恋",
                "深情侠骨风", "#100a18,#b080d0", "深情细腻"));
        books.add(book("雪中悍刀行", "烽火戏诸侯", WUXIA,
                "北凉王世子徐凤年三年游历归来，执刀天下的热血江湖",
                "北凉铁血风", "#101018,#90a0c0", "豪气干云"));
        books.add(book("剑来", "烽火戏诸侯", WUXIA,
                "泥瓶巷少年陈平安的问剑修行路，守护身边人的朴素信念",
                "市井问剑风", "#0f0f08,#a09060", "温厚绵长"));
        books.add(book("庆余年", "猫腻", WUXIA,
                "范闲穿越庆国，以现代智慧在权谋与武道间游刃有余",
                "权谋武侠风", "#0a0a10,#b0a080", "幽默犀利"));
        books.add(book("大奉打更人", "卖报小郎君", WUXIA,
                "许七安在大奉王朝从铜锣到一品武夫的热血崛起之路",
                "探案武侠风", "#10100a,#c0b050", "诙谐热血"));

        // ── 历史 HISTORY ──
        books.add(book("琅琊榜", "海宴", HISTORY,
                "梅长苏化名苏哲入京，以病弱之躯搅动朝堂风云的复仇大计",
                "宫廷权谋风", "#0a0810,#a08050", "精密典雅"));
        books.add(book("长安十二时辰", "马伯庸", HISTORY,
                "张小敬在十二时辰内拯救长安城的惊心动魄",
                "盛唐烟火风", "#1a1008,#d0a040", "紧凑写实"));
        books.add(book("赘婿", "愤怒的香蕉", HISTORY,
                "宁毅穿越成赘婿，以商战和智谋在古代建立新秩序",
                "商战古风", "#101010,#b09060", "从容睿智"));

        // ── 科幻 SCIFI ──
        books.add(book("三体", "刘慈欣", SCIFI,
                "地球文明与三体文明的史诗对抗，黑暗森林法则下的宇宙生存",
                "硬科幻宇宙风", "#000008,#4060c0", "冷峻宏大"));
        books.add(book("全职高手", "蝴蝶蓝", SCIFI,
                "荣耀职业选手叶修被俱乐部驱逐后重返巅峰的电竞传奇",
                "赛博电竞风", "#0a0a18,#40c0e0", "热血轻快"));

        return books;
    }

    private BookWorld book(String title, String author, BookWorld.Category category,
                           String loreSummary, String artStyle, String colorPalette,
                           String languageStyle) {
        BookWorld b = new BookWorld();
        b.setId(UUID.randomUUID().toString());
        b.setTitle(title);
        b.setAuthor(author);
        b.setCategory(category);
        b.setLoreSummary(loreSummary);
        b.setArtStyle(artStyle);
        b.setColorPalette(colorPalette);
        b.setLanguageStyle(languageStyle);
        b.setPreprocessed(true);
        b.setUploadedBy(0L);
        b.setCreateTime(System.currentTimeMillis());

        // 根据类别设置缘值/信值效率和主题标签
        switch (category) {
            case XIANXIA -> { b.setFateMultiplier(1.2); b.setTrustMultiplier(1.0); b.setThemeTag("情"); }
            case WUXIA -> { b.setFateMultiplier(1.0); b.setTrustMultiplier(1.3); b.setThemeTag("义"); }
            case XUANHUAN -> { b.setFateMultiplier(1.1); b.setTrustMultiplier(1.1); b.setThemeTag("争"); }
            case HISTORY -> { b.setFateMultiplier(0.9); b.setTrustMultiplier(1.4); b.setThemeTag("悟"); }
            case SCIFI -> { b.setFateMultiplier(1.3); b.setTrustMultiplier(0.8); b.setThemeTag("道"); }
            case CUSTOM -> { b.setFateMultiplier(1.0); b.setTrustMultiplier(1.0); b.setThemeTag("缘"); }
        }
        return b;
    }
}
