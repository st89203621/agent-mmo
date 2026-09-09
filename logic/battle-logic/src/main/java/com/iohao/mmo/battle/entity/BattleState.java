package com.iohao.mmo.battle.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 战斗状态 - 一场战斗的完整状态
 */
@Data
@Document("battle_state")
public class BattleState {
    @Id
    private String id;
    private long userId;
    /** 当前回合数 */
    private int round;
    /** ONGOING / VICTORY / DEFEAT */
    private String status;
    /** 玩家方单位 */
    private List<BattleUnit> playerUnits = new ArrayList<>();
    /** 敌方单位 */
    private List<BattleUnit> enemyUnits = new ArrayList<>();
    /** 本回合行动日志 */
    private List<BattleAction> actionLog = new ArrayList<>();
    /** 战斗开始时间 */
    private long startTime;
    /** 奖励描述 */
    private String rewards;
    /** 可用技能列表 */
    private List<BattleSkill> availableSkills = new ArrayList<>();

    @Data
    public static class BattleSkill {
        private String skillId;
        private String name;
        private String icon;
        private int mpCost;
        private double damageMultiplier;
        /** physical_damage / magic_damage / heal / buff_defense */
        private String effectType;
    }

    public boolean isFinished() {
        return "VICTORY".equals(status) || "DEFEAT".equals(status);
    }

    public boolean allPlayersDead() {
        return playerUnits.stream().noneMatch(BattleUnit::isAlive);
    }

    public boolean allEnemiesDead() {
        return enemyUnits.stream().noneMatch(BattleUnit::isAlive);
    }
}
