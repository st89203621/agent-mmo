package com.iohao.mmo.bookworld.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.TextIndexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 书籍文本块 - RAG检索基本单元
 * 每个chunk约200-400字，包含书籍段落内容
 */
@Data
@Document(collection = "book_chunk")
@FieldDefaults(level = AccessLevel.PRIVATE)
@CompoundIndex(name = "idx_book_seq", def = "{'bookId': 1, 'seqIndex': 1}")
public class BookChunk {
    @Id
    String id;

    /** 所属书籍ID */
    String bookId;

    /** 块序号（在书中的顺序） */
    int seqIndex;

    /** 章节标题（如有） */
    String chapterTitle;

    /** 文本内容 - 建立MongoDB全文索引 */
    @TextIndexed(weight = 2)
    String content;

    /** 关键词摘要（用于辅助检索） */
    @TextIndexed(weight = 3)
    String keywords;

    /** 块字符数 */
    int charCount;

    long createTime;
}
