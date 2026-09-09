package com.iohao.mmo.story.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 动画立绘 — 存储预生成的 animated WebP 二进制数据。
 * <p>cacheKey 格式示例：
 * <ul>
 *   <li>anim_person_{userId}</li>
 *   <li>anim_monster_妖狐</li>
 *   <li>anim_pet_{petId}</li>
 *   <li>anim_comp_{companionId}</li>
 * </ul>
 */
@Data
@Document("animated_portrait")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AnimatedPortrait {
    @Id
    String id;

    /** 归属 key，如 anim_person_123, anim_monster_妖狐 */
    @Indexed
    String groupKey;

    /** 动画二进制数据（animated WebP） */
    byte[] animationData;

    String contentType;

    /** 生成时使用的提示词 */
    String prompt;

    /** 帧数 */
    int frames;

    /** 是否收藏 */
    boolean favorite;

    long createTime;
}
