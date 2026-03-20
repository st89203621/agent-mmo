package com.iohao.mmo.story.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DialogueSession {
    @Id
    String id;

    long playerId;
    String npcId;
    int worldIndex;
    List<DialogueRecord> messages;
    long startTime;
    long endTime;
    boolean active;
    int totalFateDelta;
    int totalTrustDelta;

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DialogueRecord {
        String role;
        String content;
        String emotion;
        int choiceId;
        long timestamp;
        int fateDelta;
        /** NPC 回复时携带的选项 JSON（格式：[{id,text,fate,trust}]），供下一轮提取权重 */
        String choicesJson;
    }
}
