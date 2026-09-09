package com.iohao.mmo.bookworld.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iohao.mmo.bookworld.entity.BookWorld;
import com.iohao.mmo.bookworld.repository.BookWorldRepository;
import com.iohao.mmo.common.ai.chat.AiChatMessage;
import com.iohao.mmo.common.ai.chat.AiChatProvider;
import com.iohao.mmo.common.ai.chat.AiChatRequest;
import com.iohao.mmo.fate.entity.NpcTemplate;
import com.iohao.mmo.fate.repository.NpcTemplateRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * 书籍添加服务 - AI优先，爬取补充
 * <p>
 * 策略：
 * 1. 先尝试爬取小说站获取真实内容（用于RAG增强对话）
 * 2. 无论爬取成败，都用AI生成书籍元数据+NPC角色（AI对主流小说有充分认知）
 * 3. 爬取到的内容仅用于RAG分块，不影响核心功能
 */
@Slf4j
@Service
public class BookCrawlService {

    @Value("${crawl.search-url:https://www.xbiquge.so/search.php?keyword={keyword}}")
    private String searchUrlTemplate;

    @Value("${crawl.max-chapters:10}")
    private int maxChapters;

    @Value("${crawl.request-delay-ms:300}")
    private int requestDelayMs;

    @Resource
    private BookWorldRepository bookWorldRepository;

    @Resource
    private BookRagService bookRagService;

    @Resource
    private NpcTemplateRepository npcTemplateRepository;

    @Resource
    private AiChatProvider chatProvider;

    /**
     * 主编排方法：根据书名添加书籍并自动提取NPC
     */
    public Map<String, Object> addBookFromWeb(long userId, String bookTitle) {
        // 检查是否已存在
        List<BookWorld> existing = bookWorldRepository.findByTitle(bookTitle);
        if (!existing.isEmpty()) {
            BookWorld existBook = existing.get(0);
            List<NpcTemplate> existNpcs = npcTemplateRepository.findByBookTitle(bookTitle);
            Map<String, Object> result = new HashMap<>();
            result.put("book", existBook);
            result.put("npcs", existNpcs);
            result.put("msg", "该书籍已存在，共有" + existNpcs.size() + "个角色");
            return result;
        }

        // 1. 尝试爬取（可选，失败不影响主流程）
        String crawledContent = tryCrawlContent(bookTitle);

        // 2. AI生成书籍元数据和NPC角色（核心步骤）
        AiExtractResult aiResult = aiExtractBookAndNpcs(bookTitle, crawledContent);

        // 3. 创建BookWorld
        BookWorld book = new BookWorld();
        book.setId(UUID.randomUUID().toString());
        book.setTitle(bookTitle);
        book.setAuthor(aiResult.author);
        book.setCategory(parseCategory(aiResult.category));
        book.setLoreSummary(aiResult.loreSummary);
        book.setArtStyle(aiResult.artStyle);
        book.setColorPalette(aiResult.colorPalette);
        book.setLanguageStyle(aiResult.languageStyle);
        book.setPreprocessed(crawledContent != null && !crawledContent.isBlank());
        book.setUploadedBy(userId);
        book.setCreateTime(System.currentTimeMillis());
        bookWorldRepository.save(book);

        // 4. 如果有爬取内容，进行RAG分块处理
        if (crawledContent != null && !crawledContent.isBlank()) {
            bookRagService.processBookContent(book.getId(), crawledContent);
            log.info("书籍《{}》RAG分块完成", bookTitle);
        }

        // 5. 保存NPC
        List<NpcTemplate> npcs = buildNpcTemplates(aiResult.npcs, book.getId(), bookTitle);
        if (!npcs.isEmpty()) {
            npcTemplateRepository.saveAll(npcs);
        }

        log.info("书籍《{}》添加完成，作者:{}，提取了{}个NPC", bookTitle, aiResult.author, npcs.size());

        Map<String, Object> result = new HashMap<>();
        result.put("book", book);
        result.put("npcs", npcs);
        result.put("msg", "成功添加书籍并提取了" + npcs.size() + "个角色");
        return result;
    }

    // ── AI提取（核心） ──────────────────────────────────────

    private AiExtractResult aiExtractBookAndNpcs(String bookTitle, String crawledContent) {
        String prompt = buildPrompt(bookTitle, crawledContent);

        try {
            AiChatRequest request = AiChatRequest.builder()
                    .message(AiChatMessage.system("你是一个中文小说分析专家，对各类网络文学、武侠、仙侠、玄幻、科幻小说有深入了解。"
                            + "请根据书名（和可能提供的部分原文）分析小说，严格按JSON格式输出，不要输出任何其他内容。"))
                    .message(AiChatMessage.user(prompt))
                    .maxTokens(2048)
                    .temperature(0.3)
                    .build();

            String responseText = chatProvider.complete(request).trim();
            log.debug("AI提取原始回复: {}", responseText);

            return parseAiResult(responseText);

        } catch (Exception e) {
            log.error("AI提取失败: {}", e.getMessage(), e);
            throw new RuntimeException("AI分析书籍失败，请稍后重试");
        }
    }

    private String buildPrompt(String bookTitle, String crawledContent) {
        StringBuilder sb = new StringBuilder();
        sb.append("请分析小说《").append(bookTitle).append("》，提取书籍元数据和主要角色信息。\n\n");

        if (crawledContent != null && !crawledContent.isBlank()) {
            String truncated = crawledContent.length() > 6000
                    ? crawledContent.substring(0, 6000) : crawledContent;
            sb.append("以下是该小说的部分原文内容（供参考）：\n").append(truncated).append("\n\n");
        }

        sb.append("请严格按以下JSON格式输出：\n");
        sb.append("{\n");
        sb.append("  \"author\": \"作者名\",\n");
        sb.append("  \"loreSummary\": \"书籍简介，100-200字\",\n");
        sb.append("  \"category\": \"从 XIANXIA/WUXIA/XUANHUAN/HISTORY/SCIFI/CUSTOM 中选一个\",\n");
        sb.append("  \"artStyle\": \"适合的美术风格，10字以内，如'水墨仙侠风'\",\n");
        sb.append("  \"colorPalette\": \"5-6个代表色HEX值，逗号分隔\",\n");
        sb.append("  \"languageStyle\": \"语言风格，4字以内，如'热血白话'\",\n");
        sb.append("  \"npcs\": [\n");
        sb.append("    {\n");
        sb.append("      \"npcName\": \"角色名\",\n");
        sb.append("      \"personality\": \"性格描述，30字以内，贴合原著\",\n");
        sb.append("      \"role\": \"身份/职位，10字以内\",\n");
        sb.append("      \"emotion\": \"默认情绪，从 calm/happy/sad/cold/determined/tender/playful 中选\",\n");
        sb.append("      \"gender\": \"男 或 女\",\n");
        sb.append("      \"age\": \"年龄描述，如'18岁少年'\",\n");
        sb.append("      \"features\": \"外貌特征，30字以内\"\n");
        sb.append("    }\n");
        sb.append("  ]\n");
        sb.append("}\n\n");
        sb.append("要求：\n");
        sb.append("1. 提取5-8个最重要的角色（主角、重要配角、反派）\n");
        sb.append("2. 人设描述要贴合原著，角色要有辨识度\n");
        sb.append("3. 如果你了解这部小说，请基于你的知识补充完善\n");
        sb.append("4. 只输出JSON，不要输出其他文字");

        return sb.toString();
    }

    private AiExtractResult parseAiResult(String responseText) {
        // 提取JSON部分
        int start = responseText.indexOf('{');
        int end = responseText.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new RuntimeException("AI返回格式异常");
        }
        responseText = responseText.substring(start, end + 1);

        JSONObject json = JSON.parseObject(responseText);
        AiExtractResult result = new AiExtractResult();
        result.author = json.getString("author");
        result.loreSummary = json.getString("loreSummary");
        result.category = json.getString("category");
        result.artStyle = json.getString("artStyle");
        result.colorPalette = json.getString("colorPalette");
        result.languageStyle = json.getString("languageStyle");

        // 兜底
        if (result.author == null || result.author.isBlank()) result.author = "未知";
        if (result.loreSummary == null || result.loreSummary.isBlank()) result.loreSummary = "暂无简介";
        if (result.artStyle == null || result.artStyle.isBlank()) result.artStyle = "水墨古风";
        if (result.colorPalette == null || result.colorPalette.isBlank()) result.colorPalette = "#1a1a2e,#c9a84c,#e0e0e0";
        if (result.languageStyle == null || result.languageStyle.isBlank()) result.languageStyle = "现代白话";

        JSONArray npcsArr = json.getJSONArray("npcs");
        if (npcsArr != null) {
            for (int i = 0; i < npcsArr.size(); i++) {
                JSONObject npcJson = npcsArr.getJSONObject(i);
                NpcExtractData npc = new NpcExtractData();
                npc.npcName = npcJson.getString("npcName");
                npc.personality = npcJson.getString("personality");
                npc.role = npcJson.getString("role");
                npc.emotion = npcJson.getString("emotion");
                npc.gender = npcJson.getString("gender");
                npc.age = npcJson.getString("age");
                npc.features = npcJson.getString("features");
                if (npc.npcName != null && !npc.npcName.isBlank()) {
                    result.npcs.add(npc);
                }
            }
        }

        if (result.npcs.isEmpty()) {
            throw new RuntimeException("AI未能提取到任何角色");
        }

        return result;
    }

    // ── 爬取逻辑（可选补充） ──────────────────────────────────────

    private String tryCrawlContent(String bookTitle) {
        try {
            String searchUrl = searchUrlTemplate.replace("{keyword}",
                    URLEncoder.encode(bookTitle, StandardCharsets.UTF_8));
            Document searchPage = fetchPage(searchUrl);
            if (searchPage == null) return null;

            String bookUrl = findBookUrl(searchPage, bookTitle);
            if (bookUrl == null) {
                log.info("爬取未找到《{}》，将仅使用AI生成", bookTitle);
                return null;
            }

            Document detailPage = fetchPage(bookUrl);
            if (detailPage == null) return null;

            Elements chapterLinks = detailPage.select("#list a[href], .listmain a[href], .chapter-list a[href]");
            String content = crawlChapters(bookUrl, chapterLinks);

            if (!content.isBlank()) {
                log.info("爬取成功，内容长度: {}", content.length());
            }
            return content.isBlank() ? null : content;

        } catch (Exception e) {
            log.info("爬取失败（不影响主流程）: {}", e.getMessage());
            return null;
        }
    }

    private String findBookUrl(Document searchPage, String bookTitle) {
        String[] selectors = {
                ".result-list .result-item a[href]",
                ".booklist .bookinfo a[href]",
                ".novelslist2 li a[href]",
                "table tr td a[href]",
                ".search-list a[href]",
                "a[href*='/book/']",
                "a[href*='/novel/']"
        };

        for (String selector : selectors) {
            Elements links = searchPage.select(selector);
            for (Element link : links) {
                String text = link.text().trim();
                if (text.contains(bookTitle) || bookTitle.contains(text)) {
                    String href = link.absUrl("href");
                    if (!href.isBlank()) return href;
                }
            }
        }
        return null;
    }

    private String crawlChapters(String bookUrl, Elements chapterLinks) {
        StringBuilder content = new StringBuilder();
        int count = 0;

        for (Element link : chapterLinks) {
            if (count >= maxChapters) break;

            String chapterUrl = link.absUrl("href");
            if (chapterUrl.isBlank()) continue;

            try {
                if (requestDelayMs > 0) Thread.sleep(requestDelayMs);
                Document chapterPage = fetchPage(chapterUrl);
                if (chapterPage == null) continue;

                String chapterContent = extractText(chapterPage, "#content, .content, .chapter-content, .bookcontent");
                if (!chapterContent.isBlank()) {
                    content.append(link.text().trim()).append("\n\n");
                    content.append(chapterContent).append("\n\n");
                    count++;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.debug("爬取章节失败: {}", e.getMessage());
            }
        }
        return content.toString();
    }

    private Document fetchPage(String url) {
        try {
            return Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept", "text/html,application/xhtml+xml")
                    .header("Accept-Language", "zh-CN,zh;q=0.9")
                    .header("Referer", "https://www.google.com/")
                    .timeout(10_000)
                    .followRedirects(true)
                    .get();
        } catch (Exception e) {
            log.debug("请求页面失败: {} - {}", url, e.getMessage());
            return null;
        }
    }

    private String extractText(Document doc, String selectors) {
        for (String selector : selectors.split(",\\s*")) {
            Element el = doc.selectFirst(selector.trim());
            if (el != null) {
                String text = el.text().trim();
                if (!text.isBlank()) return text;
            }
        }
        return "";
    }

    // ── 数据构建 ──────────────────────────────────────

    private List<NpcTemplate> buildNpcTemplates(List<NpcExtractData> npcsData, String bookId, String bookTitle) {
        List<NpcTemplate> templates = new ArrayList<>();
        Set<String> usedIds = new HashSet<>();

        for (int i = 0; i < npcsData.size(); i++) {
            NpcExtractData data = npcsData.get(i);
            String npcId = "npc_" + bookId.substring(0, Math.min(8, bookId.length())) + "_" + i;

            if (!npcTemplateRepository.findByNpcId(npcId).isEmpty()) {
                npcId = npcId + "_" + System.currentTimeMillis() % 10000;
            }
            if (!usedIds.add(npcId)) continue;

            NpcTemplate t = new NpcTemplate();
            t.setId(npcId);
            t.setNpcId(npcId);
            t.setNpcName(data.npcName);
            t.setBookWorldId(bookId);
            t.setBookTitle(bookTitle);
            t.setPersonality(data.personality != null ? data.personality : "性格不详");
            t.setRole(data.role != null ? data.role : "路人");
            t.setEmotion(data.emotion != null ? data.emotion : "calm");
            t.setPortraitBase("assets/npc/" + npcId + "/base.png");
            t.setGender(data.gender != null ? data.gender : "男");
            t.setAge(data.age != null ? data.age : "青年");
            t.setFeatures(data.features != null ? data.features : "相貌平平");

            Map<String, String> personas = new HashMap<>();
            personas.put("calm", "assets/npc/" + npcId + "/calm.png");
            personas.put("happy", "assets/npc/" + npcId + "/happy.png");
            personas.put("sad", "assets/npc/" + npcId + "/sad.png");
            t.setPersonas(personas);

            templates.add(t);
        }
        return templates;
    }

    private BookWorld.Category parseCategory(String categoryStr) {
        if (categoryStr == null) return BookWorld.Category.CUSTOM;
        try {
            return BookWorld.Category.valueOf(categoryStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return BookWorld.Category.CUSTOM;
        }
    }

    // ── 内部数据结构 ──────────────────────────────────────

    private static class AiExtractResult {
        String author;
        String loreSummary;
        String category;
        String artStyle;
        String colorPalette;
        String languageStyle;
        List<NpcExtractData> npcs = new ArrayList<>();
    }

    private static class NpcExtractData {
        String npcName;
        String personality;
        String role;
        String emotion;
        String gender;
        String age;
        String features;
    }
}
