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
public class FateChoiceRequest {
    @Protobuf(order = 1)
    String npcId;
    @Protobuf(order = 2)
    int choiceId;
    @Protobuf(order = 3)
    int fateDelta;
    @Protobuf(order = 4)
    int trustDelta;
    @Protobuf(order = 5)
    int worldIndex;
}
