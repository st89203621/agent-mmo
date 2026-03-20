package com.iohao.mmo.adventure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

import java.util.List;

@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class DungeonMessage {
    String id;
    long userId;
    String dungeonId;
    String dungeonName;
    String type;
    int currentStage;
    int maxStage;
    String status;
    long startTime;
    long completeTime;
    int difficulty;
    List<StageProgressMessage> stageProgress;
    RewardMessage reward;
    boolean firstClear;
    int clearCount;
    long bestTime;
    
    @ToString
    @ProtobufClass
    @FieldDefaults(level = AccessLevel.PUBLIC)
    @ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
    public static class StageProgressMessage {
        int stageId;
        String stageName;
        boolean completed;
        int stars;
        long clearTime;
        int enemiesKilled;
        int deaths;
    }
    
    @ToString
    @ProtobufClass
    @FieldDefaults(level = AccessLevel.PUBLIC)
    @ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
    public static class RewardMessage {
        int exp;
        int gold;
        List<ItemDropMessage> items;
        String title;
        String achievement;
    }
    
    @ToString
    @ProtobufClass
    @FieldDefaults(level = AccessLevel.PUBLIC)
    @ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
    public static class ItemDropMessage {
        String itemId;
        String itemName;
        String rarity;
        int quantity;
    }
}

