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
@Document(collection = "time_rift")
public class TimeRift {
    @Id
    String id;
    long userId;
    String riftId;
    String riftName;
    RiftType type;
    int level;
    RiftStatus status;
    long startTime;
    long endTime;
    int currentWave;
    int maxWave;
    List<RiftChallenge> challenges = new ArrayList<>();
    RiftReward reward;
    
    public enum RiftType {
        PAST,       // 过去
        FUTURE,     // 未来
        PARALLEL,   // 平行世界
        CHAOS       // 混沌
    }
    
    public enum RiftStatus {
        STABLE,
        UNSTABLE,
        ACTIVE,
        CLOSING,
        CLOSED
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class RiftChallenge {
        int wave;
        String challengeType;
        boolean completed;
        long clearTime;
        int score;
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class RiftReward {
        int exp;
        int gold;
        int timeFragments;
        List<Dungeon.ItemDrop> items = new ArrayList<>();
    }
}

