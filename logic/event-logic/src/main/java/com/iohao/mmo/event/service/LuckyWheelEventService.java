package com.iohao.mmo.event.service;

import com.iohao.mmo.event.entity.LuckyWheelEvent;
import com.iohao.mmo.event.entity.PlayerEventProgress;
import com.iohao.mmo.event.repository.LuckyWheelEventRepository;
import com.iohao.mmo.event.repository.PlayerEventProgressRepository;
import jakarta.annotation.Resource;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 幸运转盘活动服务
 */
@Service
public class LuckyWheelEventService {
    
    @Resource
    LuckyWheelEventRepository wheelRepository;
    
    @Resource
    PlayerEventProgressRepository progressRepository;
    
    /**
     * 创建幸运转盘
     */
    public LuckyWheelEvent createLuckyWheel(String eventId, String wheelName) {
        LuckyWheelEvent wheel = new LuckyWheelEvent();
        wheel.setId(new ObjectId().toString());
        wheel.setEventId(eventId);
        wheel.setWheelName(wheelName);
        wheel.setCostTokenType("钻石");
        wheel.setCostPerSpin(100);
        wheel.setCostPerTenSpin(900);
        wheel.setDailyFreeSpin(1);
        
        // 配置保底
        LuckyWheelEvent.GuaranteeConfig guarantee = new LuckyWheelEvent.GuaranteeConfig();
        guarantee.setEnabled(true);
        guarantee.setGuaranteeCount(10);
        guarantee.setGuaranteePrizeId("epic_prize");
        wheel.setGuarantee(guarantee);
        
        // 配置奖品
        List<LuckyWheelEvent.WheelPrize> prizes = new ArrayList<>();
        
        // 神话奖品
        prizes.add(createPrize("mythic_pet", "神话宠物", LuckyWheelEvent.PrizeType.PET, 1, 10, true, "mythic"));
        prizes.add(createPrize("mythic_equip", "神话装备", LuckyWheelEvent.PrizeType.EQUIPMENT, 1, 10, true, "mythic"));
        
        // 传说奖品
        prizes.add(createPrize("legendary_pet", "传说宠物", LuckyWheelEvent.PrizeType.PET, 1, 50, true, "legendary"));
        prizes.add(createPrize("legendary_equip", "传说装备", LuckyWheelEvent.PrizeType.EQUIPMENT, 1, 50, true, "legendary"));
        
        // 史诗奖品
        prizes.add(createPrize("epic_item", "史诗道具", LuckyWheelEvent.PrizeType.ITEM, 1, 200, false, "epic"));
        prizes.add(createPrize("epic_title", "史诗称号", LuckyWheelEvent.PrizeType.TITLE, 1, 200, false, "epic"));
        
        // 稀有奖品
        prizes.add(createPrize("rare_item", "稀有道具", LuckyWheelEvent.PrizeType.ITEM, 3, 800, false, "rare"));
        prizes.add(createPrize("diamond", "钻石", LuckyWheelEvent.PrizeType.DIAMOND, 50, 1000, false, "uncommon"));
        
        // 普通奖品
        prizes.add(createPrize("gold", "金币", LuckyWheelEvent.PrizeType.GOLD, 1000, 3000, false, "common"));
        prizes.add(createPrize("exp", "经验", LuckyWheelEvent.PrizeType.EXP, 500, 4690, false, "common"));
        
        wheel.setPrizes(prizes);
        
        return wheelRepository.save(wheel);
    }
    
    /**
     * 转动转盘
     */
    public SpinResult spin(String wheelId, long userId, boolean useFree) {
        LuckyWheelEvent wheel = wheelRepository.findById(wheelId).orElse(null);
        
        if (wheel == null) {
            return SpinResult.error("转盘不存在");
        }
        
        PlayerEventProgress progress = getOrCreateProgress(userId, wheel.getEventId());
        
        // 检查免费次数
        if (useFree) {
            if (!progress.canUseFreeSpin()) {
                return SpinResult.error("今日免费次数已用完");
            }
            progress.useFreeSpin();
        }
        
        // 检查保底
        boolean isGuarantee = false;
        LuckyWheelEvent.WheelPrize prize;
        
        if (wheel.getGuarantee().isEnabled() && 
            progress.getGuaranteeCounter() >= wheel.getGuarantee().getGuaranteeCount()) {
            // 触发保底
            prize = wheel.getPrizes().stream()
                .filter(p -> p.getPrizeId().equals(wheel.getGuarantee().getGuaranteePrizeId()))
                .findFirst()
                .orElse(wheel.spinOnce());
            isGuarantee = true;
            progress.resetGuarantee();
        } else {
            // 正常抽奖
            prize = wheel.spinOnce();
        }
        
        progress.incrementSpin();
        
        // 如果抽到大奖,重置保底
        if (prize.isJackpot()) {
            progress.resetGuarantee();
        }
        
        progressRepository.save(progress);
        
        return SpinResult.success(prize, isGuarantee);
    }
    
    /**
     * 十连抽
     */
    public List<SpinResult> spinTen(String wheelId, long userId) {
        List<SpinResult> results = new ArrayList<>();
        
        for (int i = 0; i < 10; i++) {
            results.add(spin(wheelId, userId, false));
        }
        
        return results;
    }
    
    /**
     * 获取转盘配置
     */
    public LuckyWheelEvent getWheel(String wheelId) {
        return wheelRepository.findById(wheelId).orElse(null);
    }
    
    private PlayerEventProgress getOrCreateProgress(long userId, String eventId) {
        return progressRepository
            .findByUserIdAndEventId(userId, eventId)
            .orElseGet(() -> {
                PlayerEventProgress p = new PlayerEventProgress();
                p.setId(new ObjectId().toString());
                p.setUserId(userId);
                p.setEventId(eventId);
                p.setJoinTime(System.currentTimeMillis());
                p.setLastResetTime(System.currentTimeMillis());
                return p;
            });
    }
    
    private LuckyWheelEvent.WheelPrize createPrize(String id, String name, 
            LuckyWheelEvent.PrizeType type, int quantity, int probability, 
            boolean isJackpot, String quality) {
        LuckyWheelEvent.WheelPrize prize = new LuckyWheelEvent.WheelPrize();
        prize.setPrizeId(id);
        prize.setPrizeName(name);
        prize.setPrizeType(type);
        prize.setQuantity(quantity);
        prize.setProbability(probability);
        prize.setJackpot(isJackpot);
        prize.setQuality(quality);
        prize.setIcon("icon_" + id);
        return prize;
    }
    
    /**
     * 抽奖结果
     */
    public static class SpinResult {
        private boolean success;
        private String message;
        private LuckyWheelEvent.WheelPrize prize;
        private boolean isGuarantee;
        
        public static SpinResult success(LuckyWheelEvent.WheelPrize prize, boolean isGuarantee) {
            SpinResult result = new SpinResult();
            result.success = true;
            result.message = isGuarantee ? "保底触发!" : "抽奖成功!";
            result.prize = prize;
            result.isGuarantee = isGuarantee;
            return result;
        }
        
        public static SpinResult error(String message) {
            SpinResult result = new SpinResult();
            result.success = false;
            result.message = message;
            return result;
        }
        
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public LuckyWheelEvent.WheelPrize getPrize() { return prize; }
        public boolean isGuarantee() { return isGuarantee; }
    }
}

