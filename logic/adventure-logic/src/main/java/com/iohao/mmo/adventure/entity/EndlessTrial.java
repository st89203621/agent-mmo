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
@Document(collection = "endless_trial")
public class EndlessTrial {
    @Id
    String id;
    long userId;
    String playerName;
    TrialStatus status;
    long startTime;
    long endTime;
    int currentWave;
    int maxWaveReached;
    int totalKills;
    int totalDamage;
    long survivalTime;
    List<WaveRecord> waveRecords = new ArrayList<>();
    TrialReward reward;
    int rank;
    int score;
    
    public enum TrialStatus {
        PREPARING,
        FIGHTING,
        RESTING,
        COMPLETED,
        FAILED
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class WaveRecord {
        int wave;
        int enemyCount;
        int kills;
        long clearTime;
        boolean bossWave;
        String bossName;
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TrialReward {
        int exp;
        int gold;
        int trialPoints;
        List<Dungeon.ItemDrop> items = new ArrayList<>();
    }
}

