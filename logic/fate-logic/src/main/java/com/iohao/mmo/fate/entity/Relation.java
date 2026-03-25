package com.iohao.mmo.fate.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document
@CompoundIndex(name = "uk_player_npc_world", def = "{'playerId': 1, 'npcId': 1, 'worldIndex': 1}", unique = true)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Relation {
    @Id
    String id;

    long playerId;
    String npcId;
    String npcName;
    int worldIndex;
    int fateScore;
    int trustScore;
    List<String> keyFacts;
    String lastEmotion;
    String imageUrl;
    long updatedAt;
    boolean decayEnabled;

    public void addFateScore(int delta) {
        this.fateScore = Math.max(0, Math.min(100, this.fateScore + delta));
    }

    public void addTrustScore(int delta) {
        this.trustScore = Math.max(0, Math.min(100, this.trustScore + delta));
    }

    public void addKeyFact(String fact) {
        if (this.keyFacts == null) {
            this.keyFacts = new ArrayList<>();
        }
        this.keyFacts.add(fact);
        if (this.keyFacts.size() > 10) {
            this.keyFacts.remove(0);
        }
    }

    public void applyDecay() {
        if (!decayEnabled) return;
        long now = System.currentTimeMillis();
        long threeDaysMs = 3L * 24 * 60 * 60 * 1000;
        if (now - updatedAt > threeDaysMs) {
            long daysElapsed = (now - updatedAt) / (24L * 60 * 60 * 1000);
            int decayAmount = (int) (daysElapsed * 2);
            this.fateScore = Math.max(0, this.fateScore - decayAmount);
        }
    }

    /** 缘分等级标签 */
    public String getFateLevel() {
        if (fateScore >= 95) return "知己";
        if (fateScore >= 80) return "挚友";
        if (fateScore >= 60) return "深交";
        if (fateScore >= 40) return "相识";
        if (fateScore >= 20) return "初识";
        return "陌路";
    }

    public int isAtMilestone() {
        if (fateScore >= 95) return 95;
        if (fateScore >= 80) return 80;
        if (fateScore >= 60) return 60;
        return 0;
    }

    /** 缘分阈值事件定义 */
    public static final int[] MILESTONES = {20, 40, 60, 80, 95};

    public static final String[][] MILESTONE_EVENTS = {
        {"初次邂逅", "你们终于记住了彼此的名字"},
        {"信物交换", "互赠了一件有纪念意义的小物件"},
        {"月下倾心", "在月光下倾诉了各自的秘密"},
        {"生死相依", "在危难中彼此扶持，建立了不可动摇的信任"},
        {"灵魂共鸣", "命运将你们紧紧连在一起，跨越轮回也不会改变"},
    };

    /** 已触发的里程碑事件 */
    List<Integer> triggeredMilestones;

    /** 获取下一个待触发的里程碑 */
    public int getNextMilestone() {
        for (int m : MILESTONES) {
            if (fateScore >= m && (triggeredMilestones == null || !triggeredMilestones.contains(m))) {
                return m;
            }
        }
        return 0;
    }

    /** 标记里程碑已触发 */
    public void markMilestoneTriggered(int milestone) {
        if (triggeredMilestones == null) triggeredMilestones = new ArrayList<>();
        if (!triggeredMilestones.contains(milestone)) triggeredMilestones.add(milestone);
    }
}
