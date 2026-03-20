package com.iohao.mmo.event.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 幸运转盘活动实体
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LuckyWheelEvent {
    @Id
    String id;
    
    /** 所属活动ID */
    String eventId;
    
    /** 转盘名称 */
    String wheelName;
    
    /** 转盘奖品列表 */
    List<WheelPrize> prizes;
    
    /** 消耗代币类型 */
    String costTokenType;
    
    /** 单次消耗数量 */
    int costPerSpin;
    
    /** 十连消耗数量 */
    int costPerTenSpin;
    
    /** 保底机制 */
    GuaranteeConfig guarantee;
    
    /** 每日免费次数 */
    int dailyFreeSpin;
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class WheelPrize {
        /** 奖品ID */
        String prizeId;
        /** 奖品名称 */
        String prizeName;
        /** 奖品类型 */
        PrizeType prizeType;
        /** 奖品数量 */
        int quantity;
        /** 中奖概率(万分比) */
        int probability;
        /** 是否为大奖 */
        boolean isJackpot;
        /** 奖品图标 */
        String icon;
        /** 奖品品质 */
        String quality;
    }
    
    public enum PrizeType {
        /** 金币 */
        GOLD,
        /** 钻石 */
        DIAMOND,
        /** 道具 */
        ITEM,
        /** 装备 */
        EQUIPMENT,
        /** 宠物 */
        PET,
        /** 称号 */
        TITLE,
        /** 经验 */
        EXP
    }
    
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class GuaranteeConfig {
        /** 保底抽数 */
        int guaranteeCount;
        /** 保底奖品ID */
        String guaranteePrizeId;
        /** 是否启用 */
        boolean enabled;
    }
    
    public LuckyWheelEvent() {
        this.prizes = new ArrayList<>();
    }
    
    public WheelPrize spinOnce() {
        int totalProbability = prizes.stream()
            .mapToInt(WheelPrize::getProbability)
            .sum();
            
        int random = (int) (Math.random() * totalProbability);
        int current = 0;
        
        for (WheelPrize prize : prizes) {
            current += prize.getProbability();
            if (random < current) {
                return prize;
            }
        }
        
        return prizes.get(prizes.size() - 1);
    }
}

