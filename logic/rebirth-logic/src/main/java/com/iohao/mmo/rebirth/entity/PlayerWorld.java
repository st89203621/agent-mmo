package com.iohao.mmo.rebirth.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlayerWorld {
    @Id
    long id;

    int currentWorldIndex;
    List<WorldRecord> worlds;
    int totalRebirths;
    long lastRebirthTime;

    public void initDefault() {
        this.currentWorldIndex = 1;
        this.worlds = new ArrayList<>();
        this.totalRebirths = 0;
        this.lastRebirthTime = 0;
    }

    public WorldRecord getCurrentWorldRecord() {
        if (worlds == null) return null;
        return worlds.stream()
                .filter(w -> w.getWorldIndex() == currentWorldIndex)
                .findFirst()
                .orElse(null);
    }

    /** 跨世携带的信物ID列表 */
    List<String> keepsakeIds;
    /** NPC印记：前世高缘值NPC会在新世以不同身份出现 */
    List<NpcImprint> npcImprints;

    /** 添加NPC印记 */
    public void addNpcImprint(String npcId, String npcName, int fateScore, int worldIndex) {
        if (npcImprints == null) npcImprints = new ArrayList<>();
        // 只记录缘分>=60的NPC
        if (fateScore >= 60) {
            npcImprints.add(new NpcImprint(npcId, npcName, fateScore, worldIndex));
        }
    }

    /** 添加信物 */
    public void addKeepsake(String keepsakeId) {
        if (keepsakeIds == null) keepsakeIds = new ArrayList<>();
        keepsakeIds.add(keepsakeId);
    }

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class NpcImprint {
        String npcId;
        String npcName;
        int fateScore;
        int fromWorldIndex;

        public NpcImprint(String npcId, String npcName, int fateScore, int fromWorldIndex) {
            this.npcId = npcId;
            this.npcName = npcName;
            this.fateScore = fateScore;
            this.fromWorldIndex = fromWorldIndex;
        }
    }

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class WorldRecord {
        int worldIndex;
        String bookId;
        String bookTitle;
        long enterTime;
        long exitTime;
        int finalFateScore;
        int finalTrustScore;
        String rebirthPoem;
        WorldStatus status;
        /** 本世浇灌情花的缘值 */
        int fateWatered;
        /** 本世浇灌情花的信值 */
        int trustInfused;

        public enum WorldStatus {
            CURRENT,
            COMPLETED,
            PENDING
        }
    }
}
