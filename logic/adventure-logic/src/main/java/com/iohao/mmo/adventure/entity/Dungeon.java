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
    String description;
    DungeonType type;
    int currentStage;
    int maxStage;
    DungeonStatus status;
    long startTime;
    long completeTime;
    int difficulty;
    int recommendedLevel;
    int dailyLimit;
    int todayAttempts;
    String lastAttemptDate;
    List<StageInfo> stages = new ArrayList<>();
    List<StageProgress> stageProgress = new ArrayList<>();
    DungeonReward reward;
    DungeonReward firstClearReward;
    boolean firstClear;
    int clearCount;
    long bestTime;
    String bookTitle;

    public enum DungeonType {
        STORY,      // 剧情副本
        CHALLENGE,  // 挑战副本
        BOSS,       // BOSS副本
        ENDLESS,    // 无尽模式
        RAID,       // 团队副本
        PUZZLE      // 解谜副本
    }

    public enum DungeonStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED,
        FAILED
    }

    /** 关卡定义信息 */
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class StageInfo {
        int stageId;
        String stageName;
        String enemyName;
        int enemyLevel;
        boolean isBoss;
        StageReward reward;
    }

    /** 每关奖励 */
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class StageReward {
        int exp;
        int gold;
        List<ItemDrop> items = new ArrayList<>();
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

    /** 重置每日次数（日期变更时调用） */
    public void resetDailyIfNeeded() {
        String today = java.time.LocalDate.now().toString();
        if (!today.equals(lastAttemptDate)) {
            todayAttempts = 0;
            lastAttemptDate = today;
        }
    }

    public boolean canAttemptToday() {
        resetDailyIfNeeded();
        return dailyLimit <= 0 || todayAttempts < dailyLimit;
    }
}

