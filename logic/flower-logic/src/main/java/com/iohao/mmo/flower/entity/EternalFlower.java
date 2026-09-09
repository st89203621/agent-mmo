package com.iohao.mmo.flower.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EternalFlower {
    @Id
    long playerId;

    /** 已浇灌的总缘值 */
    int totalFateWatered;
    /** 已注入的总信值 */
    int totalTrustInfused;
    /** 经历的世数 */
    int worldCount;
    /** 是否已绽放 */
    boolean bloomed;
    /** 花语 */
    String flowerVerse;
    /** 每一世浇灌记录 */
    List<WorldWatering> worldWaterings;

    public void water(int fate, int trust) {
        this.totalFateWatered += fate;
        this.totalTrustInfused += trust;
    }

    /** 记录一世的浇灌 */
    public void recordWorldWatering(int worldIndex, int fate, int trust) {
        if (worldWaterings == null) worldWaterings = new ArrayList<>();
        worldWaterings.add(new WorldWatering(worldIndex, fate, trust));
        worldCount = worldWaterings.size();
    }

    /** 花的阶段：由总缘值决定大小 */
    public String getStage() {
        if (bloomed) return "永恒";
        if (totalFateWatered >= 500) return "盛放";
        if (totalFateWatered >= 300) return "初绽";
        if (totalFateWatered >= 150) return "含苞";
        if (totalFateWatered >= 50) return "萌芽";
        return "种子";
    }

    /** 花色：由总信值决定品质 */
    public String getColor() {
        if (totalTrustInfused >= 500) return "彩";
        if (totalTrustInfused >= 300) return "金";
        if (totalTrustInfused >= 150) return "紫";
        if (totalTrustInfused >= 50) return "青";
        return "白";
    }

    /** 花名：阶段+花色组合 */
    public String getFlowerName() {
        return getColor() + getStage() + "情花";
    }

    @Data
    public static class WorldWatering {
        int worldIndex;
        int fateWatered;
        int trustInfused;

        public WorldWatering(int worldIndex, int fateWatered, int trustInfused) {
            this.worldIndex = worldIndex;
            this.fateWatered = fateWatered;
            this.trustInfused = trustInfused;
        }
    }
}
