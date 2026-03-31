package com.iohao.mmo.coexplore.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 共探书境会话 — 谜局模式
 * <p>
 * 状态流转: WAITING → EXPLORING(轮1) → EXPLORING(轮2) → REASONING → BOSS → COMPLETED
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

    /** WAITING / EXPLORING / REASONING / BOSS / COMPLETED */
    String status;
    /** 当前轮次：1-2 为探索轮，3 为推理轮 */
    int currentRound;

    // ── 谜局剧本（加入时 AI 一次性生成） ──

    /** 谜题背景描述 */
    String mysteryBackground;
    /** 三个嫌疑答案 */
    List<String> suspects;
    /** 正确答案索引 (0-2) */
    int correctAnswer = -1;

    /** 第一轮地点（4个） */
    List<ClueLocation> round1Locations;
    /** 第二轮地点（4个） */
    List<ClueLocation> round2Locations;

    // ── 轮次记录 ──

    List<CoexploreRound> rounds = new ArrayList<>();

    // ── 推理阶段 ──

    /** 主/客选择的嫌疑人索引，-1 = 未作答 */
    int hostAnswer = -1;
    int guestAnswer = -1;
    /** 推理结果：PERFECT / CONSENSUS / SPLIT / LOST */
    String reasoningResult;

    // ── 缘分值 ──

    int hostFateValue;
    int guestFateValue;

    // ── Boss ──

    int bossHp;
    int bossDamageHost;
    int bossDamageGuest;

    long createTime;

    // ── 内嵌类型 ──

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ClueLocation {
        String id;
        String name;
        String description;
        /** 探索后获得的线索 */
        String clueText;
        /** 对方可见的模糊痕迹 */
        String trace;
    }
}
