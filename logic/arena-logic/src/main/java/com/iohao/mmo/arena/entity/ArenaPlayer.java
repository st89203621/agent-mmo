package com.iohao.mmo.arena.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

/**
 * 竞技场玩家信息
 */
@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class ArenaPlayer {
    long playerId;
    String playerName;
    int level;
    long power;
    int wins;
    int losses;
    int rating;
    int rank;
    long lastBattleTime;
    boolean canBattle;
}

