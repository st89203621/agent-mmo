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
    /** 信值一致性追踪：记录玩家选择的倾向性标签 */
    List<String> choiceTags;
    /** 信值一致性得分（选择越一致得分越高） */
    int consistencyScore;

    /** 记录选择倾向并计算一致性 */
    public int trackChoiceConsistency(String tag) {
        if (choiceTags == null) choiceTags = new java.util.ArrayList<>();
        choiceTags.add(tag);

        if (choiceTags.size() < 2) {
            consistencyScore = 0;
            return 0;
        }

        // 计算最近选择的一致性：相同倾向越多，信值奖励越高
        String lastTag = choiceTags.get(choiceTags.size() - 1);
        long matchCount = choiceTags.stream().filter(t -> t.equals(lastTag)).count();
        int ratio = (int) (matchCount * 100 / choiceTags.size());

        // 一致性>60%给予正向信值，<30%给予负向
        if (ratio >= 60) {
            consistencyScore = Math.min(5, (ratio - 60) / 10 + 1);
        } else if (ratio < 30) {
            consistencyScore = -2;
        } else {
            consistencyScore = 0;
        }
        return consistencyScore;
    }

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DialogueRecord {
        String role;
        String content;
        String emotion;
        int choiceId;
        long timestamp;
        int fateDelta;
        int trustDelta;
        /** 选择的倾向标签：善/恶/中庸/刚/柔 */
        String choiceTag;
        /** NPC 回复时携带的选项 JSON（格式：[{id,text,fate,trust,tag}]），供下一轮提取权重 */
        String choicesJson;
    }
}
