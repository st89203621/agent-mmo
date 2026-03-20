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
public class NpcDialogueTemplate {
    @Id
    String id;

    String npcId;
    int worldIndex;
    String triggerCondition;
    List<DialogueLine> dialogues;

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DialogueLine {
        String lineId;
        String speaker;
        String emotion;
        String text;
        List<Choice> choices;
    }

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Choice {
        int id;
        String text;
        int fateDelta;
        int trustDelta;
        String nextLineId;
    }
}
