package com.iohao.mmo.battle.entity;

import lombok.Data;

/**
 * 战斗单位 - 参战的一方（玩家或怪物）
 */
@Data
public class BattleUnit {
    private String unitId;
    private String name;
    /** PLAYER / MONSTER */
    private String unitType;
    private int maxHp;
    private int hp;
    private int maxMp;
    private int mp;
    private int physicsAttack;
    private int physicsDefense;
    private int magicAttack;
    private int magicDefense;
    private int speed;

    public boolean isAlive() {
        return hp > 0;
    }

    public int takeDamage(int damage) {
        int actual = Math.min(hp, Math.max(0, damage));
        hp -= actual;
        return actual;
    }

    public void heal(int amount) {
        hp = Math.min(maxHp, hp + Math.max(0, amount));
    }
}
