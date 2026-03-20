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

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class WorldRecord {
        int worldIndex;
        String bookId;
        String bookTitle;
        long enterTime;
        long exitTime;
        int finalFateScore;
        String rebirthPoem;
        WorldStatus status;

        public enum WorldStatus {
            CURRENT,
            COMPLETED,
            PENDING
        }
    }
}
