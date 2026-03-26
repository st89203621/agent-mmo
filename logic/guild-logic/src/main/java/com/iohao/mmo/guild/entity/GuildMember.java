package com.iohao.mmo.guild.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

/**
 * 盟会成员（嵌套在Guild文档中）
 */
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GuildMember {
    long playerId;
    String playerName;
    /** LEADER(盟主), ELDER(长老), MEMBER(成员) */
    String position;
    long contribution;
    long construction;
    long honor;
    long joinTime;
}
