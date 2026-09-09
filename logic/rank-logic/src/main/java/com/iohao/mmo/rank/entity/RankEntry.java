package com.iohao.mmo.rank.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

/**
 * 排行榜条目
 */
@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class RankEntry {
    int rank;
    long playerId;
    String playerName;
    int level;
    long value;
    String rankType; // level, power, wealth, achievement
}

