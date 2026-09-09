package com.iohao.mmo.event.entity;

import com.iohao.mmo.common.event.EventType;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashMap;
import java.util.Map;

/**
 * 游戏活动实体
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GameEvent {
    @Id
    String id;
    
    /** 活动名称 */
    String name;
    
    /** 活动类型 */
    EventType eventType;
    
    /** 活动描述 */
    String description;
    
    /** 活动状态 */
    EventStatus status;
    
    /** 开始时间 */
    long startTime;
    
    /** 结束时间 */
    long endTime;
    
    /** 活动配置参数 */
    Map<String, Object> config;
    
    /** 活动奖励配置 */
    Map<String, Object> rewards;
    
    /** 参与条件 */
    Map<String, Object> requirements;
    
    public enum EventStatus {
        /** 未开始 */
        NOT_STARTED,
        /** 进行中 */
        ACTIVE,
        /** 已结束 */
        ENDED,
        /** 已暂停 */
        PAUSED
    }
    
    public GameEvent() {
        this.config = new HashMap<>();
        this.rewards = new HashMap<>();
        this.requirements = new HashMap<>();
        this.status = EventStatus.NOT_STARTED;
    }
    
    public boolean isActive() {
        long now = System.currentTimeMillis();
        return status == EventStatus.ACTIVE && now >= startTime && now <= endTime;
    }
}

