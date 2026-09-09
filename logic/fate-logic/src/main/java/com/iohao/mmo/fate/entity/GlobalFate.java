package com.iohao.mmo.fate.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 玩家全局缘值/信值，跨世累计
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GlobalFate {
    @Id
    long playerId;

    /** 累世总缘值 */
    int totalFate;
    /** 累世总信值 */
    int totalTrust;
    /** 当世缘值 */
    int currentFate;
    /** 当世信值 */
    int currentTrust;
    /** 每一世的缘值记录 */
    List<Integer> worldFateHistory;
    /** 每一世的信值记录 */
    List<Integer> worldTrustHistory;

    public void addCurrentFate(int delta) {
        this.currentFate = Math.max(0, this.currentFate + delta);
        if (delta > 0) {
            this.totalFate += delta;
        }
    }

    public void addCurrentTrust(int delta) {
        this.currentTrust = Math.max(0, this.currentTrust + delta);
        if (delta > 0) {
            this.totalTrust += delta;
        }
    }

    /** 轮回结算：归档当世，重置当世值 */
    public void archiveAndReset() {
        if (worldFateHistory == null) worldFateHistory = new ArrayList<>();
        if (worldTrustHistory == null) worldTrustHistory = new ArrayList<>();
        worldFateHistory.add(currentFate);
        worldTrustHistory.add(currentTrust);
        currentFate = 0;
        currentTrust = 0;
    }

    /** 缘信品级 */
    public String getFateGrade() {
        boolean highFate = totalFate >= 200;
        boolean highTrust = totalTrust >= 200;
        if (highFate && highTrust) return "金缘";
        if (highFate) return "浮缘";
        if (highTrust) return "孤信";
        return "初入红尘";
    }
}
