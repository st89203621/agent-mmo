package com.iohao.mmo.memory.proto;

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
public class MemoryFragmentMessage {
    @Protobuf(order = 1)
    String fragmentId;
    @Protobuf(order = 2)
    long playerId;
    @Protobuf(order = 3)
    String npcId;
    @Protobuf(order = 4)
    String npcName;
    @Protobuf(order = 5)
    int worldIndex;
    @Protobuf(order = 6)
    String title;
    @Protobuf(order = 7)
    String excerpt;
    @Protobuf(order = 8)
    int fateScore;
    @Protobuf(order = 9)
    String imageUrl;
    @Protobuf(order = 10)
    long createTime;
    @Protobuf(order = 11)
    boolean locked;
    @Protobuf(order = 12)
    String unlockCondition;
}
