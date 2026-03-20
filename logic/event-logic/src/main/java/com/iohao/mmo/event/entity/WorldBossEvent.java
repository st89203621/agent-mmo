package com.iohao.mmo.event.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 世界BOSS活动实体
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WorldBossEvent {
    @Id
    String id;
    
    /** 所属活动ID */
    String eventId;
    
    /** BOSS名称 */
    String bossName;
    
    /** BOSS等级 */
    int bossLevel;
    
    /** BOSS总血量 */
    long totalHp;
    
    /** BOSS当前血量 */
    long currentHp;
    
    /** BOSS状态 */
    BossStatus status;
    
    /** 刷新时间 */
    long spawnTime;
    
    /** 击杀时间 */
    Long killTime;
    
    /** 参与玩家伤害记录 */
    List<PlayerDamage> damageRecords;
    
    /** 最后一击玩家ID */
    Long lastHitPlayerId;
    
    /** BOSS技能列表 */
    List<String> skills;
    
    /** 掉落奖励池 */
    List<String> rewardPool;
    
    public enum BossStatus {
        /** 等待刷新 */
        WAITING,
        /** 战斗中 */
        FIGHTING,
        /** 已击杀 */
        KILLED,
        /** 逃跑 */
        ESCAPED
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class PlayerDamage {
        /** 玩家ID */
        long userId;
        /** 玩家名称 */
        String userName;
        /** 造成的伤害 */
        long damage;
        /** 伤害占比 */
        double damagePercent;
        /** 参与时间 */
        long joinTime;
        /** 击杀次数 */
        int killCount;
    }
    
    public WorldBossEvent() {
        this.damageRecords = new ArrayList<>();
        this.skills = new ArrayList<>();
        this.rewardPool = new ArrayList<>();
        this.status = BossStatus.WAITING;
    }
    
    public void addDamage(long userId, String userName, long damage) {
        PlayerDamage record = damageRecords.stream()
            .filter(d -> d.getUserId() == userId)
            .findFirst()
            .orElse(null);
            
        if (record == null) {
            record = new PlayerDamage();
            record.setUserId(userId);
            record.setUserName(userName);
            record.setDamage(0);
            record.setJoinTime(System.currentTimeMillis());
            damageRecords.add(record);
        }
        
        record.setDamage(record.getDamage() + damage);
        currentHp = Math.max(0, currentHp - damage);
        
        if (currentHp <= 0) {
            status = BossStatus.KILLED;
            killTime = System.currentTimeMillis();
            lastHitPlayerId = userId;
        }
        
        calculateDamagePercent();
    }
    
    private void calculateDamagePercent() {
        long totalDamage = damageRecords.stream()
            .mapToLong(PlayerDamage::getDamage)
            .sum();
            
        if (totalDamage > 0) {
            damageRecords.forEach(record -> {
                record.setDamagePercent((double) record.getDamage() / totalDamage * 100);
            });
        }
    }
    
    public List<PlayerDamage> getTopDamagers(int limit) {
        return damageRecords.stream()
            .sorted((a, b) -> Long.compare(b.getDamage(), a.getDamage()))
            .limit(limit)
            .toList();
    }
}

