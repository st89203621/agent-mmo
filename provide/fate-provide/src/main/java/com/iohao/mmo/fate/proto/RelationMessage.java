package com.iohao.mmo.fate.proto;

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
public class RelationMessage {
    @Protobuf(order = 1)
    String relationId;
    @Protobuf(order = 2)
    long playerId;
    @Protobuf(order = 3)
    String npcId;
    @Protobuf(order = 4)
    String npcName;
    @Protobuf(order = 5)
    int worldIndex;
    @Protobuf(order = 6)
    int fateScore;
    @Protobuf(order = 7)
    int trustScore;
    @Protobuf(order = 8)
    String lastEmotion;
    @Protobuf(order = 9)
    String imageUrl;
    @Protobuf(order = 10)
    String keyFacts;
    @Protobuf(order = 11)
    long lastInteractTime;
}
