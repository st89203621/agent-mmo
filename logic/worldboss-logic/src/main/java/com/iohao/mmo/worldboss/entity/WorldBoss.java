package com.iohao.mmo.worldboss.entity;

import lombok.Data;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Data
public class WorldBoss {
    private String bossId;
    private String bossName;
    private int bossLevel;
    private long maxHp;
    private long currentHp;
    private int attack;
    private int defense;
    private double x;
    private double y;
    private String mapId;
    private BossStatus status;
    private long spawnTime;
    private long nextSpawnTime;
    private List<BossSkill> skills;
    private List<DropItem> dropItems;
    private Map<Long, PlayerDamage> damageMap = new ConcurrentHashMap<>();
    private long lastSkillTime;

    public enum BossStatus {
        WAITING(0),
        ALIVE(1),
        DEAD(2);

        private final int value;

        BossStatus(int value) {
            this.value = value;
        }

        public int getValue() {
            return value;
        }
    }

    public void addDamage(long userId, String playerName, long damage) {
        damageMap.computeIfAbsent(userId, k -> new PlayerDamage(userId, playerName))
                .addDamage(damage);
    }

    public List<PlayerDamage> getDamageRankList() {
        List<PlayerDamage> list = new ArrayList<>(damageMap.values());
        list.sort((a, b) -> Long.compare(b.getTotalDamage(), a.getTotalDamage()));
        for (int i = 0; i < list.size(); i++) {
            list.get(i).setRank(i + 1);
        }
        return list;
    }

    public void takeDamage(long damage) {
        currentHp = Math.max(0, currentHp - damage);
        if (currentHp == 0) {
            status = BossStatus.DEAD;
        }
    }

    public boolean isDead() {
        return status == BossStatus.DEAD;
    }

    public void reset() {
        currentHp = maxHp;
        status = BossStatus.ALIVE;
        damageMap.clear();
        spawnTime = System.currentTimeMillis();
    }
}

