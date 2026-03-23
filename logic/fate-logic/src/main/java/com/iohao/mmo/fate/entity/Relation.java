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

    public int isAtMilestone() {
        if (fateScore >= 95) return 95;
        if (fateScore >= 80) return 80;
        if (fateScore >= 60) return 60;
        return 0;
    }
}
