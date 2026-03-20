package com.iohao.mmo.memory.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MemoryFragment {
    @Id
    String id;

    long playerId;
    String npcId;
    String npcName;
    int worldIndex;
    String title;
    String excerpt;
    int fateScore;
    String imageUrl;
    long createTime;
    boolean locked;
    String unlockCondition;
    String bookTitle;
    String era;
    String emotionTone;
    boolean affectsNextWorld;
}
