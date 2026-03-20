package com.iohao.mmo.bookworld.init;

import com.iohao.mmo.bookworld.entity.BookWorld;
import com.iohao.mmo.bookworld.repository.BookWorldRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
public class BookWorldDataInit {

    @Resource
    BookWorldRepository bookWorldRepository;

    @PostConstruct
    public void init() {
        if (bookWorldRepository.count() > 0) {
            log.info("书籍世界数据已存在，跳过初始化");
            return;
        }

        log.info("开始初始化书籍世界数据...");

        List<BookWorld> books = new ArrayList<>();
        books.add(createBook("诛仙", "萧鼎", BookWorld.Category.XIANXIA,
                "青云山修仙世界，正邪之争，张小凡与碧瑶的缘分",
                "水墨仙侠风", "#1a1028,#c9a84c", "文言夹白话"));
        books.add(createBook("凡人修仙传", "忘语", BookWorld.Category.XIANXIA,
                "修仙界韩立从散修到大能的传奇历程，重视资源积累",
                "古朴修仙风", "#101a10,#4aaa96", "平实叙述"));
        books.add(createBook("斗破苍穹", "天蚕土豆", BookWorld.Category.XUANHUAN,
                "斗气大陆，萧炎从废柴到强者，丹道与斗技",
                "热血斗气风", "#1a1200,#c9a84c", "热血激昂"));
        books.add(createBook("完美世界", "辰东", BookWorld.Category.XUANHUAN,
                "石昊的上古血脉之路，荒古传说与神话",
                "史诗神话风", "#000a1a,#6090d0", "宏大叙事"));
        books.add(createBook("遮天", "辰东", BookWorld.Category.XUANHUAN,
                "叶凡从地球到神秘宇宙的极道之旅",
                "极道神秘风", "#1a0a00,#c9a84c", "深沉内敛"));
        books.add(createBook("斗罗大陆", "唐家三少", BookWorld.Category.XUANHUAN,
                "唐三转生斗罗大陆，武魂觉醒，天斗帝国争霸",
                "武魂战技风", "#0a0a1a,#8050c0", "热血少年"));
        books.add(createBook("择天记", "猫腻", BookWorld.Category.XIANXIA,
                "陈长生与教典，星宿命盘，命运与自由",
                "清冷仙道风", "#050510,#a0c0ff", "从容淡然"));

        bookWorldRepository.saveAll(books);
        log.info("书籍世界初始化完成，共 {} 本书", books.size());
    }

    private BookWorld createBook(String title, String author, BookWorld.Category category,
                                  String loreSummary, String artStyle, String colorPalette,
                                  String languageStyle) {
        BookWorld book = new BookWorld();
        book.setId(UUID.randomUUID().toString());
        book.setTitle(title);
        book.setAuthor(author);
        book.setCategory(category);
        book.setLoreSummary(loreSummary);
        book.setArtStyle(artStyle);
        book.setColorPalette(colorPalette);
        book.setLanguageStyle(languageStyle);
        book.setPreprocessed(true);
        book.setUploadedBy(0L);
        book.setCreateTime(System.currentTimeMillis());
        return book;
    }
}
