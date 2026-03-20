package com.iohao.mmo.quest.proto;

import com.baidu.bjf.remoting.protobuf.annotation.Protobuf;
import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class QuestRewardMessage {
    @Protobuf(order = 1)
    int rewardType;
    
    @Protobuf(order = 2)
    String itemId;
    
    @Protobuf(order = 3)
    int quantity;
    
    @Protobuf(order = 4)
    int exp;
    
    @Protobuf(order = 5)
    int gold;
}

