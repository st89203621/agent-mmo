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

    public enum Category {
        XIANXIA,
        WUXIA,
        XUANHUAN,
        HISTORY,
        SCIFI,
        CUSTOM
    }
}
