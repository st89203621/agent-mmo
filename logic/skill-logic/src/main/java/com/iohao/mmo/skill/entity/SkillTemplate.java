package com.iohao.mmo.skill.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * 技能模板 - 定义可学习的技能
 */
@Data
@Document("skill_template")
public class SkillTemplate {
    @Id
    private String id;
    /** 技能名称 */
    private String name;
    /** 技能描述 */
    private String description;
    /** 技能分支：EMOTION(情感系) / COMBAT(战斗系) */
    private String branch;
    /** 技能类型：ACTIVE(主动) / PASSIVE(被动) */
    private String type;
    /** 最大等级 */
    private int maxLevel;
    /** 学习所需等级 */
    private int requiredLevel;
    /** 前置技能ID列表 */
    private List<String> prerequisites;
    /** 每级升级消耗（统一使用技能点） */
    private int costPerLevel;
    /** 效果描述（JSON格式，便于扩展） */
    private String effectJson;
    /** 图标标识 */
    private String icon;
    /** 排序权重 */
    private int sortOrder;
}
