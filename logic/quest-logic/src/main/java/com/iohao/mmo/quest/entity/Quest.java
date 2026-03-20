package com.iohao.mmo.quest.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Quest {
    @Id
    String id;
    
    long userId;
    String questId;
    String questName;
    String description;
    
    QuestType questType;
    QuestStatus status;
    
    int currentProgress;
    int targetProgress;
    
    List<QuestReward> rewards;
    
    int requiredLevel;
    String npcId;
    
    long acceptTime;
    long completeTime;
    int timeLimit;
    
    public enum QuestType {
        MAIN(1, "主线任务"),
        MASTER(2, "师门任务"),
        REGION(3, "区域任务"),
        DUNGEON(4, "副本任务"),
        SCROLL(5, "卷轴任务"),
        MATERIAL(6, "材料任务"),
        HIDDEN(7, "隐藏任务");
        
        private final int code;
        private final String name;
        
        QuestType(int code, String name) {
            this.code = code;
            this.name = name;
        }
        
        public int getCode() { return code; }
        public String getName() { return name; }
    }
    
    public enum QuestStatus {
        AVAILABLE(0, "可接取"),
        ACCEPTED(1, "进行中"),
        COMPLETED(2, "已完成"),
        REWARDED(3, "已领奖"),
        ABANDONED(4, "已放弃");
        
        private final int code;
        private final String name;
        
        QuestStatus(int code, String name) {
            this.code = code;
            this.name = name;
        }
        
        public int getCode() { return code; }
        public String getName() { return name; }
    }
    
    public void updateProgress(int progress) {
        this.currentProgress = Math.min(this.currentProgress + progress, this.targetProgress);
        if (this.currentProgress >= this.targetProgress) {
            this.status = QuestStatus.COMPLETED;
            this.completeTime = System.currentTimeMillis();
        }
    }
    
    public boolean isExpired() {
        if (timeLimit <= 0) return false;
        long elapsed = System.currentTimeMillis() - acceptTime;
        return elapsed > timeLimit * 1000L;
    }
}

