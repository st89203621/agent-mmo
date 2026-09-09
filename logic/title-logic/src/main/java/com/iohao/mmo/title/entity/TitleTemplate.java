package com.iohao.mmo.title.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 称号模板 - 定义游戏中所有可获取的称号
 * 三种类型：
 * PRESTIGE(声望) - 加攻击和内力(魔攻)
 * POWER(威望) - 加血量和防御
 * HONOR(荣誉) - 加附加攻防和敏捷
 */
@Data
@Document("title_template")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TitleTemplate {
    @Id
    String id;
    String name;
    String titleType;
    int requiredLevel;
    String description;
    /** 攻击加成 */
    int bonusAtk;
    /** 防御加成 */
    int bonusDef;
    /** 生命加成 */
    int bonusHp;
    /** 魔攻/内力加成 */
    int bonusMagicAtk;
    /** 附加攻击加成 */
    int bonusExtraAtk;
    /** 附加防御加成 */
    int bonusExtraDef;
    /** 敏捷加成 */
    int bonusAgility;
}
