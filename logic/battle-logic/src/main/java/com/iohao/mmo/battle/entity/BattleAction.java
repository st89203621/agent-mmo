package com.iohao.mmo.battle.entity;

import lombok.Data;

/**
 * 战斗行动记录
 */
@Data
public class BattleAction {
    private String actorId;
    private String actorName;
    /** ATTACK / SKILL / DEFEND / FLEE */
    private String actionType;
    private String targetId;
    private String targetName;
    private String skillName;
    private int damage;
    private int heal;
    private String description;
}
