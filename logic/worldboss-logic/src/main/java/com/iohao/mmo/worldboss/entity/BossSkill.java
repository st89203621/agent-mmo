package com.iohao.mmo.worldboss.entity;

import lombok.Data;

@Data
public class BossSkill {
    private int skillId;
    private String skillName;
    private String skillDesc;
    private SkillType skillType;
    private int damage;
    private double range;
    private int cooldown;

    public enum SkillType {
        SINGLE_TARGET(1),
        AOE(2),
        DOT(3);

        private final int value;

        SkillType(int value) {
            this.value = value;
        }

        public int getValue() {
            return value;
        }
    }
}

