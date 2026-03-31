package com.iohao.mmo.coexplore.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

/**
 * 单轮探索记录
 */
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CoexploreRound {
    int round;

    /** 双方选择的地点 ID */
    String hostLocationId;
    String guestLocationId;

    /** 双方获得的线索 */
    String hostClue;
    String guestClue;

    /** 对方可见的痕迹 */
    String hostTrace;
    String guestTrace;

    /** 本轮获得的缘分值 */
    int hostFateGain;
    int guestFateGain;

    /** 双方是否选了同一个地点 */
    boolean sameLocation;
}
