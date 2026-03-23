package com.iohao.mmo.bookworld.service;

import com.iohao.mmo.bookworld.entity.BookChunk;
import com.iohao.mmo.bookworld.entity.BookWorld;
import com.iohao.mmo.bookworld.repository.BookChunkRepository;
import com.iohao.mmo.bookworld.repository.BookWorldRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.data.mongodb.core.query.TextQuery;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 书籍RAG服务 - 基于MongoDB全文索引的轻量级检索增强生成
 * <p>
 * 流程：书籍文本 → 分块存储 → 全文检索 → 注入AI提示词
 */
@Slf4j
@Service
public class BookRagService {

    private static final int CHUNK_SIZE = 300;
    private static final int CHUNK_OVERLAP = 50;
    private static final int MAX_RETRIEVE_CHUNKS = 3;

    @Resource
    BookChunkRepository bookChunkRepository;

    @Resource
    BookWorldRepository bookWorldRepository;

    @Resource
    MongoTemplate mongoTemplate;

    /**
     * 将书籍全文分块并存储到MongoDB
     *
     * @param bookId  书籍ID
     * @param content 书籍全文内容
     * @return 分块数量
     */
    public int processBookContent(String bookId, String content) {
        if (content == null || content.isBlank()) return 0;

        // 清除旧分块
        bookChunkRepository.deleteByBookId(bookId);

        List<BookChunk> chunks = splitIntoChunks(bookId, content);
        bookChunkRepository.saveAll(chunks);

        // 标记书籍已预处理
        bookWorldRepository.findById(bookId).ifPresent(book -> {
            book.setPreprocessed(true);
            bookWorldRepository.save(book);
        });

        log.info("书籍 {} 分块完成，共 {} 块", bookId, chunks.size());
        return chunks.size();
    }

    /**
     * 根据对话上下文检索相关书籍段落
     *
     * @param bookId      书籍ID
     * @param queryText   检索查询（玩家输入 + NPC名称等上下文）
     * @return 拼接后的相关段落文本（用于注入提示词）
     */
    public String retrieveContext(String bookId, String queryText) {
        if (bookId == null || queryText == null || queryText.isBlank()) return "";

        // 检查是否有分块数据
        long chunkCount = bookChunkRepository.countByBookId(bookId);
        if (chunkCount == 0) return "";

        try {
            // MongoDB全文检索
            TextCriteria textCriteria = TextCriteria.forDefaultLanguage().matching(queryText);
            Query query = TextQuery.queryText(textCriteria)
                    .sortByScore()
                    .addCriteria(Criteria.where("bookId").is(bookId))
                    .with(PageRequest.of(0, MAX_RETRIEVE_CHUNKS));

            List<BookChunk> results = mongoTemplate.find(query, BookChunk.class);

            if (results.isEmpty()) {
                // 全文检索无结果时，回退到前几块（书籍开头通常包含世界观介绍）
                results = bookChunkRepository.findByBookIdOrderBySeqIndex(bookId).stream()
                        .limit(2)
                        .collect(Collectors.toList());
            }

            return results.stream()
                    .map(BookChunk::getContent)
                    .collect(Collectors.joining("\n---\n"));

        } catch (Exception e) {
            log.warn("RAG检索失败: bookId={}, error={}", bookId, e.getMessage());
            return "";
        }
    }

    /**
     * 文本分块：按段落/句子边界切分，保留上下文重叠
     */
    private List<BookChunk> splitIntoChunks(String bookId, String content) {
        List<BookChunk> chunks = new ArrayList<>();
        // 先按段落分割
        String[] paragraphs = content.split("\\n{2,}|\\r\\n{2,}");
        StringBuilder buffer = new StringBuilder();
        int seqIndex = 0;
        String currentChapter = "";

        for (String para : paragraphs) {
            para = para.trim();
            if (para.isEmpty()) continue;

            // 检测章节标题（常见格式：第X章、第X回、Chapter等）
            if (para.matches("^(第[零一二三四五六七八九十百千\\d]+[章回节卷]|Chapter\\s*\\d+).*") && para.length() < 50) {
                currentChapter = para;
                continue;
            }

            buffer.append(para).append("\n");

            if (buffer.length() >= CHUNK_SIZE) {
                chunks.add(buildChunk(bookId, seqIndex++, currentChapter, buffer.toString()));
                // 保留末尾部分作为重叠
                String overlap = buffer.substring(Math.max(0, buffer.length() - CHUNK_OVERLAP));
                buffer = new StringBuilder(overlap);
            }
        }

        // 处理剩余内容
        if (!buffer.isEmpty()) {
            chunks.add(buildChunk(bookId, seqIndex, currentChapter, buffer.toString()));
        }

        return chunks;
    }

    private BookChunk buildChunk(String bookId, int seqIndex, String chapter, String content) {
        BookChunk chunk = new BookChunk();
        chunk.setId(bookId + "_" + seqIndex);
        chunk.setBookId(bookId);
        chunk.setSeqIndex(seqIndex);
        chunk.setChapterTitle(chapter);
        chunk.setContent(content.trim());
        chunk.setKeywords(extractKeywords(content));
        chunk.setCharCount(content.length());
        chunk.setCreateTime(System.currentTimeMillis());
        return chunk;
    }

    /**
     * 简易关键词提取：取高频非停用词（MVP阶段）
     */
    private String extractKeywords(String text) {
        // 按标点和空格分词，统计词频
        String[] tokens = text.split("[\\p{P}\\s\\n]+");
        Map<String, Integer> freq = new HashMap<>();
        for (String token : tokens) {
            if (token.length() >= 2 && token.length() <= 8) {
                freq.merge(token, 1, Integer::sum);
            }
        }
        // 取频率最高的10个词
        return freq.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(10)
                .map(Map.Entry::getKey)
                .collect(Collectors.joining(" "));
    }
}
