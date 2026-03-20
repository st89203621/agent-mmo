package com.iohao.mmo.event.service;

import com.iohao.mmo.event.entity.PlayerEventProgress;
import com.iohao.mmo.event.entity.WorldBossEvent;
import com.iohao.mmo.event.repository.PlayerEventProgressRepository;
import com.iohao.mmo.event.repository.WorldBossEventRepository;
import jakarta.annotation.Resource;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 世界BOSS活动服务
 */
@Service
public class WorldBossEventService {
    
    @Resource
    WorldBossEventRepository bossRepository;
    
    @Resource
    PlayerEventProgressRepository progressRepository;
    
    /**
     * 创建世界BOSS
     */
    public WorldBossEvent createWorldBoss(String eventId, String bossName, int level, long totalHp) {
        WorldBossEvent boss = new WorldBossEvent();
        boss.setId(new ObjectId().toString());
        boss.setEventId(eventId);
        boss.setBossName(bossName);
        boss.setBossLevel(level);
        boss.setTotalHp(totalHp);
        boss.setCurrentHp(totalHp);
        boss.setStatus(WorldBossEvent.BossStatus.FIGHTING);
        boss.setSpawnTime(System.currentTimeMillis());
        
        // 配置BOSS技能
        List<String> skills = new ArrayList<>();
        skills.add("毁灭冲击");
        skills.add("狂暴咆哮");
        skills.add("地裂斩");
        skills.add("死亡凝视");
        boss.setSkills(skills);
        
        // 配置奖励池
        List<String> rewards = new ArrayList<>();
        rewards.add("传说装备碎片");
        rewards.add("神话宠物蛋");
        rewards.add("稀有强化石");
        rewards.add("大量金币");
        boss.setRewardPool(rewards);
        
        return bossRepository.save(boss);
    }
    
    /**
     * 攻击BOSS
     */
    public AttackResult attackBoss(String bossId, long userId, String userName, long damage) {
        WorldBossEvent boss = bossRepository.findById(bossId).orElse(null);
        
        if (boss == null) {
            return AttackResult.error("BOSS不存在");
        }
        
        if (boss.getStatus() != WorldBossEvent.BossStatus.FIGHTING) {
            return AttackResult.error("BOSS已被击杀或逃跑");
        }
        
        // 添加伤害记录
        boss.addDamage(userId, userName, damage);
        bossRepository.save(boss);
        
        // 更新玩家进度
        updatePlayerProgress(userId, boss.getEventId(), damage);
        
        boolean killed = boss.getStatus() == WorldBossEvent.BossStatus.KILLED;
        
        return AttackResult.success(boss, damage, killed);
    }
    
    /**
     * 获取伤害排行榜
     */
    public List<WorldBossEvent.PlayerDamage> getDamageRanking(String bossId, int limit) {
        WorldBossEvent boss = bossRepository.findById(bossId).orElse(null);
        
        if (boss == null) {
            return new ArrayList<>();
        }
        
        return boss.getTopDamagers(limit);
    }
    
    /**
     * 获取当前活跃的BOSS
     */
    public List<WorldBossEvent> getActiveBosses() {
        return bossRepository.findByStatus(WorldBossEvent.BossStatus.FIGHTING);
    }
    
    /**
     * BOSS逃跑(超时未击杀)
     */
    public void bossescape(String bossId) {
        WorldBossEvent boss = bossRepository.findById(bossId).orElse(null);
        
        if (boss != null && boss.getStatus() == WorldBossEvent.BossStatus.FIGHTING) {
            boss.setStatus(WorldBossEvent.BossStatus.ESCAPED);
            bossRepository.save(boss);
        }
    }
    
    /**
     * 更新玩家活动进度
     */
    private void updatePlayerProgress(long userId, String eventId, long damage) {
        PlayerEventProgress progress = progressRepository
            .findByUserIdAndEventId(userId, eventId)
            .orElseGet(() -> {
                PlayerEventProgress p = new PlayerEventProgress();
                p.setId(new ObjectId().toString());
                p.setUserId(userId);
                p.setEventId(eventId);
                p.setJoinTime(System.currentTimeMillis());
                return p;
            });
        
        progress.addDamage(damage);
        progressRepository.save(progress);
    }
    
    /**
     * 攻击结果
     */
    public static class AttackResult {
        private boolean success;
        private String message;
        private WorldBossEvent boss;
        private long damage;
        private boolean killed;
        
        public static AttackResult success(WorldBossEvent boss, long damage, boolean killed) {
            AttackResult result = new AttackResult();
            result.success = true;
            result.message = killed ? "恭喜!BOSS已被击杀!" : "攻击成功!";
            result.boss = boss;
            result.damage = damage;
            result.killed = killed;
            return result;
        }
        
        public static AttackResult error(String message) {
            AttackResult result = new AttackResult();
            result.success = false;
            result.message = message;
            return result;
        }
        
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public WorldBossEvent getBoss() { return boss; }
        public long getDamage() { return damage; }
        public boolean isKilled() { return killed; }
    }
}

