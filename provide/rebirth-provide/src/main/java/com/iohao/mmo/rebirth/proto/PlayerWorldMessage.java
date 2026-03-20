package com.iohao.mmo.rebirth.proto;

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
public class PlayerWorldMessage {
    @Protobuf(order = 1)
    long userId;
    @Protobuf(order = 2)
    int currentWorldIndex;
    @Protobuf(order = 3)
    String currentBookId;
    @Protobuf(order = 4)
    String currentBookTitle;
    @Protobuf(order = 5)
    String currentBookArtStyle;
    @Protobuf(order = 6)
    int totalRebirths;
    @Protobuf(order = 7)
    int fatePointsCarried;
}
