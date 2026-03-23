package com.iohao.mmo.story.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 场景图片 - 图片二进制数据存储在 MongoDB 中
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SceneImage {
    @Id
    String id;

    /** 缓存key: npcId_worldIndex，同一NPC同一世界只生成一次 */
    @Indexed(unique = true)
    String cacheKey;

    /** 图片二进制数据（PNG格式） */
    byte[] imageData;

    /** 图片MIME类型 */
    String contentType;

    /** 生成时使用的提示词 */
    String prompt;

    long createTime;
}
