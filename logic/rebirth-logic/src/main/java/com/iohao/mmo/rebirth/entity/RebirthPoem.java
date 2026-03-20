package com.iohao.mmo.rebirth.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RebirthPoem {
    @Id
    String id;

    int worldIndex;
    String bookTitle;
    String poem;
    long generatedTime;
}
