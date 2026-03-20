package com.iohao.mmo.event.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 限时秘境活动实体
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TimedRealmEvent {
    @Id
    String id;
    
    /** 所属活动ID */
    String eventId;
    
    /** 秘境名称 */
    String realmName;
    
    /** 秘境难度 */
    RealmDifficulty difficulty;
    
    /** 秘境层数 */
    int totalFloors;
    
    /** 每层配置 */
    List<FloorConfig> floors;
    
    /** 开放时间段 */
    List<TimeSlot> openTimeSlots;
    
    /** 进入条件 */
    RealmRequirement requirement;
    
    /** 奖励倍率 */
    double rewardMultiplier;
    
    public enum RealmDifficulty {
        EASY("简单", 1.0),
        NORMAL("普通", 1.5),
        HARD("困难", 2.0),
        NIGHTMARE("噩梦", 3.0),
        HELL("地狱", 5.0);
        
        private final String name;
        private final double multiplier;
        
        RealmDifficulty(String name, double multiplier) {
            this.name = name;
            this.multiplier = multiplier;
        }
        
        public String getName() {
            return name;
        }
        
        public double getMultiplier() {
            return multiplier;
        }
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class FloorConfig {
        /** 层数 */
        int floor;
        /** 怪物配置 */
        List<String> monsters;
        /** BOSS配置 */
        String boss;
        /** 时间限制(秒) */
        int timeLimit;
        /** 通关奖励 */
        List<String> rewards;
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TimeSlot {
        /** 开始时间(小时) */
        int startHour;
        /** 结束时间(小时) */
        int endHour;
        /** 星期几(1-7, 0表示每天) */
        int dayOfWeek;
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class RealmRequirement {
        /** 最低等级 */
        int minLevel;
        /** 需要的道具 */
        String requiredItem;
        /** 需要的道具数量 */
        int requiredItemCount;
        /** 每日进入次数限制 */
        int dailyLimit;
    }
    
    public TimedRealmEvent() {
        this.floors = new ArrayList<>();
        this.openTimeSlots = new ArrayList<>();
    }
    
    public boolean isOpenNow() {
        if (openTimeSlots.isEmpty()) {
            return true;
        }
        
        long now = System.currentTimeMillis();
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.setTimeInMillis(now);
        
        int currentHour = cal.get(java.util.Calendar.HOUR_OF_DAY);
        int currentDay = cal.get(java.util.Calendar.DAY_OF_WEEK);
        
        return openTimeSlots.stream().anyMatch(slot -> {
            boolean hourMatch = currentHour >= slot.getStartHour() && currentHour < slot.getEndHour();
            boolean dayMatch = slot.getDayOfWeek() == 0 || slot.getDayOfWeek() == currentDay;
            return hourMatch && dayMatch;
        });
    }
}

