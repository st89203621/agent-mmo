package com.iohao.mmo.teambattle.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TeamBattleRecord {
    @Id
    String id;

    String teamAId;
    String teamBId;
    List<Long> teamAMembers;
    List<Long> teamBMembers;
    /** A / B */
    String winner;
    long mvpPlayerId;
    String mvpPlayerName;
    int fateReward;
    int trustReward;
    long battleTime;
}
