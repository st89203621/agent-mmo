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
public class DialogueMessage {
    @Protobuf(order = 1)
    String sessionId;
    @Protobuf(order = 2)
    String speaker;
    @Protobuf(order = 3)
    String emotion;
    @Protobuf(order = 4)
    String text;
    @Protobuf(order = 5)
    String choicesJson;
    @Protobuf(order = 6)
    boolean allowFreeInput;
    @Protobuf(order = 7)
    String bookRefs;
    @Protobuf(order = 8)
    int fateDelta;
    @Protobuf(order = 9)
    int trustDelta;
}
