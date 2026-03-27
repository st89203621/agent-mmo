package com.iohao.mmo.bookworld.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookWorld {
    @Id
    String id;

    String title;
    String author;
    Category category;
    String loreSummary;
    String artStyle;
    String colorPalette;
    String languageStyle;
    String coverUrl;
    boolean isPreprocessed;
    String vectorIndexId;
    long uploadedBy;
    long createTime;

    /** 缘值获取效率倍率（默认1.0） */
    double fateMultiplier;
    /** 信值获取效率倍率（默认1.0） */
    double trustMultiplier;
    /** 书世界的核心主题标签：情/义/道/争/悟 */
    String themeTag;

    public double getFateMultiplier() {
        return fateMultiplier > 0 ? fateMultiplier : 1.0;
    }

    public double getTrustMultiplier() {
        return trustMultiplier > 0 ? trustMultiplier : 1.0;
    }

    public enum Category {
        XIANXIA,
        WUXIA,
        XUANHUAN,
        HISTORY,
        SCIFI,
        CUSTOM
    }
}
