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
@Document(collection = "exploration")
public class Exploration {
    @Id
    String id;
    long userId;
    String explorationId;
    String location;
    ExplorationStatus status;
    long startTime;
    long endTime;
    int currentStep;
    int totalSteps;
    List<ExplorationEvent> events = new ArrayList<>();
    ExplorationReward reward;
    
    public enum ExplorationStatus {
        PREPARING,
        EXPLORING,
        COMPLETED,
        ABANDONED
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ExplorationEvent {
        String eventId;
        String eventType;
        String description;
        String choice;
        String result;
        long timestamp;
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ExplorationReward {
        int exp;
        int gold;
        List<String> discoveries = new ArrayList<>();
        List<Dungeon.ItemDrop> items = new ArrayList<>();
    }
}

