package com.iohao.mmo.worldboss.entity;

import lombok.Data;

@Data
public class PlayerDamage {
    private int rank;
    private long userId;
    private String playerName;
    private long totalDamage;
    private int attackCount;

    public PlayerDamage(long userId, String playerName) {
        this.userId = userId;
        this.playerName = playerName;
        this.totalDamage = 0;
        this.attackCount = 0;
    }

    public void addDamage(long damage) {
        this.totalDamage += damage;
        this.attackCount++;
    }

    public double getDamagePercent(long totalBossDamage) {
        if (totalBossDamage == 0) return 0;
        return (double) totalDamage / totalBossDamage * 100;
    }
}

