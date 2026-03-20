package com.iohao.mmo.story.proto;

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
public class DialogueRequest {
    @Protobuf(order = 1)
    String npcId;
    @Protobuf(order = 2)
    int worldIndex;
    @Protobuf(order = 3)
    int choiceId;
    @Protobuf(order = 4)
    String freeText;
    @Protobuf(order = 5)
    String sessionId;
}
