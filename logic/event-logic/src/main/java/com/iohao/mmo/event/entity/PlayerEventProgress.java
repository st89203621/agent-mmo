package com.iohao.mmo.event.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashMap;
import java.util.Map;

/**
 * 玩家活动进度实体
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlayerEventProgress {
    @Id
    String id;
    
    /** 玩家ID */
    long userId;
    
    /** 活动ID */
    String eventId;
    
    /** 参与时间 */
    long joinTime;
    
    /** 活动进度数据 */
    Map<String, Object> progressData;
    
    /** 已领取的奖励 */
    Map<String, Boolean> claimedRewards;
    
    /** 活动积分 */
    int eventPoints;
    
    /** 完成状态 */
    boolean completed;
    
    /** 完成时间 */
    Long completionTime;
    
    // 天降神宠相关
    /** 砸蛋次数 */
    int eggSmashCount;
    /** 获得的宠物列表 */
    String obtainedPets;
    
    // 世界BOSS相关
    /** 造成的总伤害 */
    long totalDamage;
    /** 参与次数 */
    int participationCount;
    
    // 限时秘境相关
    /** 当前层数 */
    int currentFloor;
    /** 最高层数 */
    int maxFloor;
    /** 通关时间 */
    long clearTime;
    
    // 幸运转盘相关
    /** 抽奖次数 */
    int spinCount;
    /** 保底计数 */
    int guaranteeCounter;
    /** 今日免费次数 */
    int todayFreeSpin;
    /** 上次重置时间 */
    long lastResetTime;
    
    public PlayerEventProgress() {
        this.progressData = new HashMap<>();
        this.claimedRewards = new HashMap<>();
    }
    
    public void incrementEggSmash() {
        this.eggSmashCount++;
    }
    
    public void addDamage(long damage) {
        this.totalDamage += damage;
        this.participationCount++;
    }
    
    public void updateFloor(int floor) {
        this.currentFloor = floor;
        if (floor > this.maxFloor) {
            this.maxFloor = floor;
        }
    }
    
    public void incrementSpin() {
        this.spinCount++;
        this.guaranteeCounter++;
    }
    
    public void resetGuarantee() {
        this.guaranteeCounter = 0;
    }
    
    public boolean canUseFreeSpin() {
        long now = System.currentTimeMillis();
        long dayInMillis = 24 * 60 * 60 * 1000;
        
        if (now - lastResetTime > dayInMillis) {
            todayFreeSpin = 0;
            lastResetTime = now;
        }
        
        return todayFreeSpin < 1;
    }
    
    public void useFreeSpin() {
        todayFreeSpin++;
    }
}

