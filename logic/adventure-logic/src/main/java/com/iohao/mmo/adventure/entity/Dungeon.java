package com.iohao.mmo.adventure.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document(collection = "dungeon")
public class Dungeon {
    @Id
    String id;
    long userId;
    String dungeonId;
    String dungeonName;
    DungeonType type;
    int currentStage;
    int maxStage;
    DungeonStatus status;
    long startTime;
    long completeTime;
    int difficulty;
    List<StageProgress> stageProgress = new ArrayList<>();
    DungeonReward reward;
    boolean firstClear;
    int clearCount;
    long bestTime;
    
    public enum DungeonType {
        STORY,      // 剧情副本
        CHALLENGE,  // 挑战副本
        RAID,       // 团队副本
        ENDLESS,    // 无尽模式
        BOSS,       // BOSS副本
        PUZZLE      // 解谜副本
    }
    
    public enum DungeonStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED,
        FAILED
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class StageProgress {
        int stageId;
        String stageName;
        boolean completed;
        int stars;
        long clearTime;
        int enemiesKilled;
        int deaths;
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DungeonReward {
        int exp;
        int gold;
        List<ItemDrop> items = new ArrayList<>();
        String title;
        String achievement;
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ItemDrop {
        String itemId;
        String itemName;
        String rarity;
        int quantity;
    }
}

