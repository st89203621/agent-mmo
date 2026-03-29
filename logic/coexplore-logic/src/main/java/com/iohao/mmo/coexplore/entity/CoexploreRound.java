package com.iohao.mmo.coexplore.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * 单轮探索记录
 */
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CoexploreRound {
    int round;

    /** 探索阶段 */
    String hostLocationId;
    String guestLocationId;
    String hostDiscovery;
    String guestDiscovery;
    /** 对方的痕迹（探索后可见） */
    String hostTrace;
    String guestTrace;

    /** 投票阶段 */
    List<VoteOption> voteOptions;
    String hostVote;
    String guestVote;
    String voteResult;

    /** 本轮获得的缘分值 */
    int hostFateGain;
    int guestFateGain;

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class VoteOption {
        String id;
        String text;
        String description;
    }
}
