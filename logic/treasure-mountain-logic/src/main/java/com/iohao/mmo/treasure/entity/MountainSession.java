package com.iohao.mmo.treasure.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 玩家宝山挖掘会话
 * 记录每日挖掘进度和奖励
 */
@Data
@Document(collection = "mountain_session")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MountainSession {
    @Id
    String id;

    long userId;
    String guildId;
    String mountainType;

    /** 当日已挖掘次数 */
    int digCount;
    /** 当日已获取的总奖励值 */
    long totalReward;
    /** 日期标记（yyyyMMdd） */
    int dateTag;
}
