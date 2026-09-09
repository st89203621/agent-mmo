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
@Document(collection = "treasure_hunt")
public class TreasureHunt {
    @Id
    String id;
    long userId;
    String mapId;
    String mapName;
    TreasureRarity rarity;
    int x;
    int y;
    TreasureStatus status;
    long startTime;
    long foundTime;
    int digProgress;
    int digRequired;
    TreasureChest chest;
    
    public enum TreasureRarity {
        COMMON,
        UNCOMMON,
        RARE,
        EPIC,
        LEGENDARY,
        MYTHIC
    }
    
    public enum TreasureStatus {
        LOCKED,
        SEARCHING,
        DIGGING,
        FOUND,
        OPENED
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TreasureChest {
        String chestId;
        TreasureRarity rarity;
        boolean locked;
        String keyRequired;
        List<Dungeon.ItemDrop> contents = new ArrayList<>();
        int gold;
        int gems;
    }
}

