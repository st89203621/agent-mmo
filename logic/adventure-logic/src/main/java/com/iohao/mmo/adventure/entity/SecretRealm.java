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
@Document(collection = "secret_realm")
public class SecretRealm {
    @Id
    String id;
    long userId;
    String realmId;
    String realmName;
    RealmType type;
    int level;
    RealmStatus status;
    long enterTime;
    long exitTime;
    int explorationProgress;
    List<RealmDiscovery> discoveries = new ArrayList<>();
    RealmBoss boss;
    RealmReward reward;
    
    public enum RealmType {
        ANCIENT,    // 远古
        MYSTICAL,   // 神秘
        FORBIDDEN,  // 禁地
        CELESTIAL,  // 天界
        INFERNAL    // 地狱
    }
    
    public enum RealmStatus {
        SEALED,
        OPEN,
        EXPLORING,
        BOSS_FIGHT,
        CLEARED
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class RealmDiscovery {
        String discoveryId;
        String name;
        String type;
        long timestamp;
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class RealmBoss {
        String bossId;
        String bossName;
        int level;
        long hp;
        boolean defeated;
        long defeatTime;
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class RealmReward {
        int exp;
        int gold;
        int realmEssence;
        List<Dungeon.ItemDrop> items = new ArrayList<>();
        String title;
    }
}

