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
public class CreateMemoryRequest {
    @Protobuf(order = 1)
    String npcId;
    @Protobuf(order = 2)
    String npcName;
    @Protobuf(order = 3)
    int worldIndex;
    @Protobuf(order = 4)
    String bookTitle;
    @Protobuf(order = 5)
    int fateScore;
    @Protobuf(order = 6)
    String dialogueSummary;
}
