package com.iohao.mmo.event.action;

import com.alibaba.fastjson2.JSON;
import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.event.cmd.EventCmd;
import com.iohao.mmo.event.entity.DivinePetEgg;
import com.iohao.mmo.event.entity.EventResponse;
import com.iohao.mmo.event.entity.LuckyWheelEvent;
import com.iohao.mmo.event.entity.WorldBossEvent;
import com.iohao.mmo.event.service.DivinePetEventService;
import com.iohao.mmo.event.service.LuckyWheelEventService;
import com.iohao.mmo.event.service.WorldBossEventService;
import jakarta.annotation.Resource;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 活动系统Action
 */
@Component
@ActionController(EventCmd.cmd)
public class EventAction {
    
    @Resource
    DivinePetEventService divinePetEventService;
    
    @Resource
    WorldBossEventService worldBossEventService;
    
    @Resource
    LuckyWheelEventService luckyWheelEventService;
    
    // ========== 活动通用 ==========

    @ActionMethod(EventCmd.listEvents)
    public EventResponse listEvents() {
        // 返回当前所有活动列表
        java.util.List<java.util.Map<String, Object>> events = new java.util.ArrayList<>();

        // 天降神宠活动
        java.util.Map<String, Object> divinePet = new java.util.HashMap<>();
        divinePet.put("id", "divine_pet_drop");
        divinePet.put("name", "天降神宠");
        divinePet.put("type", "DIVINE_PET_DROP");
        divinePet.put("status", "ACTIVE");
        divinePet.put("startTime", System.currentTimeMillis());
        divinePet.put("endTime", System.currentTimeMillis() + 86400000L);
        events.add(divinePet);

        // 世界BOSS活动
        java.util.Map<String, Object> worldBoss = new java.util.HashMap<>();
        worldBoss.put("id", "world_boss");
        worldBoss.put("name", "世界BOSS");
        worldBoss.put("type", "WORLD_BOSS");
        worldBoss.put("status", "ACTIVE");
        worldBoss.put("startTime", System.currentTimeMillis());
        worldBoss.put("endTime", System.currentTimeMillis() + 86400000L);
        events.add(worldBoss);

        // 幸运转盘活动
        java.util.Map<String, Object> luckyWheel = new java.util.HashMap<>();
        luckyWheel.put("id", "lucky_wheel");
        luckyWheel.put("name", "幸运转盘");
        luckyWheel.put("type", "LUCKY_WHEEL");
        luckyWheel.put("status", "ACTIVE");
        luckyWheel.put("startTime", System.currentTimeMillis());
        luckyWheel.put("endTime", System.currentTimeMillis() + 86400000L);
        events.add(luckyWheel);

        return EventResponse.success(events);
    }

    // ========== 天降神宠活动 ==========

    @ActionMethod(EventCmd.listPetEggs)
    public EventResponse listPetEggs(EventRequest request) {
        String eventId = request.eventId != null ? request.eventId : "divine_pet_drop";
        List<DivinePetEgg> eggs = divinePetEventService.getActiveEggs(eventId);

        // 如果没有蛋,自动生成一些
        if (eggs.isEmpty()) {
            eggs = divinePetEventService.spawnMultipleEggs(eventId, 10);
        }

        return EventResponse.success(eggs);
    }

    @ActionMethod(EventCmd.smashPetEgg)
    public EventResponse smashPetEgg(EventRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        DivinePetEventService.SmashResult result =
            divinePetEventService.smashEgg(request.eggId, userId, flowContext);

        if (result.isSuccess()) {
            return EventResponse.success(result);
        } else {
            return EventResponse.error(result.getMessage());
        }
    }
    
    // ========== 世界BOSS活动 ==========
    
    @ActionMethod(EventCmd.challengeWorldBoss)
    public EventResponse challengeWorldBoss(EventRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        // 这里简化处理,实际应该从战斗系统获取伤害值
        long damage = request.damage > 0 ? request.damage : (long)(Math.random() * 10000);

        WorldBossEventService.AttackResult result =
            worldBossEventService.attackBoss(request.bossId, userId, request.userName, damage);
        return EventResponse.success(result);
    }

    @ActionMethod(EventCmd.getBossRanking)
    public EventResponse getBossRanking(EventRequest request) {
        List<WorldBossEvent.PlayerDamage> ranking =
            worldBossEventService.getDamageRanking(request.bossId, 100);
        return EventResponse.success(ranking);
    }
    
    // ========== 幸运转盘活动 ==========
    
    @ActionMethod(EventCmd.spinWheel)
    public EventResponse spinWheel(EventRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();

        if (request.spinCount == 10) {
            List<LuckyWheelEventService.SpinResult> results =
                luckyWheelEventService.spinTen(request.wheelId, userId);
            return EventResponse.success(results);
        } else {
            LuckyWheelEventService.SpinResult result =
                luckyWheelEventService.spin(request.wheelId, userId, request.useFree);
            return EventResponse.success(result);
        }
    }

    @ActionMethod(EventCmd.getWheelConfig)
    public EventResponse getWheelConfig(EventRequest request) {
        LuckyWheelEvent wheel = luckyWheelEventService.getWheel(request.wheelId);
        return EventResponse.success(wheel);
    }
    
    @Data
    public static class EventRequest {
        String eventId;
        String eggId;
        String bossId;
        String userName;
        long damage;
        String wheelId;
        boolean useFree;
        int spinCount;
    }
}

