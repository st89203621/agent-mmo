package com.iohao.mmo.skill.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 玩家已学习/解锁的技能
 */
@Data
@Document("player_skill")
public class PlayerSkill {
    @Id
    private String id;
    @Indexed
    private long userId;
    /** 对应的技能模板ID */
    private String skillTemplateId;
    /** 当前等级 */
    private int level;
    /** 是否已解锁 */
    private boolean unlocked;
}
