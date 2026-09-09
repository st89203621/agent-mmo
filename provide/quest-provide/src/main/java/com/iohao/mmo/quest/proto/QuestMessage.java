package com.iohao.mmo.quest.proto;

import com.baidu.bjf.remoting.protobuf.annotation.Protobuf;
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
public class QuestMessage {
    @Protobuf(order = 1)
    String questId;
    
    @Protobuf(order = 2)
    String questName;
    
    @Protobuf(order = 3)
    String description;
    
    @Protobuf(order = 4)
    int questType;
    
    @Protobuf(order = 5)
    int status;
    
    @Protobuf(order = 6)
    int currentProgress;
    
    @Protobuf(order = 7)
    int targetProgress;
    
    @Protobuf(order = 8)
    List<QuestRewardMessage> rewards;
    
    @Protobuf(order = 9)
    int requiredLevel;
    
    @Protobuf(order = 10)
    String npcId;
    
    @Protobuf(order = 11)
    long acceptTime;
    
    @Protobuf(order = 12)
    long completeTime;
    
    @Protobuf(order = 13)
    int timeLimit;
}

