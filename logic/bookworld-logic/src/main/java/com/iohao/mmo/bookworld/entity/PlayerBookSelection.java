package com.iohao.mmo.bookworld.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlayerBookSelection {
    /** id格式: userId_worldIndex */
    @Id
    String id;

    long userId;
    int worldIndex;
    String bookId;
    long selectTime;
    boolean active;
    /** 用户自定义的图片风格（覆盖书籍默认artStyle） */
    String customArtStyle;
}
