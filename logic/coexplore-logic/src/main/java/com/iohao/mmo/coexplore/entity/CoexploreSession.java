package com.iohao.mmo.coexplore.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 共探书境会话
 * <p>
 * 状态流转: WAITING → EXPLORING → GATHERING → VOTING → (循环3轮) → BOSS → COMPLETED
 */
@Data
@Document(collection = "coexplore_session")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CoexploreSession {
    @Id
    String id;

    long hostId;
    String hostName;
    long guestId;
    String guestName;

    /** WAITING / EXPLORING / GATHERING / VOTING / BOSS / COMPLETED */
    String status;
    /** 当前轮次 1-3 */
    int currentRound;
    /** 当前阶段 EXPLORE / GATHER / VOTE / BOSS */
    String currentPhase;

    /** 两人缘分值 */
    int hostFateValue;
    int guestFateValue;

    /** 每轮事件记录 */
    List<CoexploreRound> rounds = new ArrayList<>();

    /** Boss战结果 */
    int bossHp;
    int bossDamageHost;
    int bossDamageGuest;

    long createTime;

    /** 当前轮次的探索地点选项 */
    List<Location> locations = new ArrayList<>();

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Location {
        String id;
        String name;
        String description;
        /** 探索后获得的发现描述 */
        String discovery;
        /** 该地点的缘分值奖励 */
        int fateReward;
    }
}
