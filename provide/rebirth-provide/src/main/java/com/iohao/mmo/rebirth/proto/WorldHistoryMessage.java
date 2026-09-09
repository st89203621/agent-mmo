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
public class WorldHistoryMessage {
    @Protobuf(order = 1)
    int worldIndex;
    @Protobuf(order = 2)
    String bookId;
    @Protobuf(order = 3)
    String bookTitle;
    @Protobuf(order = 4)
    long enterTime;
    @Protobuf(order = 5)
    long exitTime;
    @Protobuf(order = 6)
    int finalFatePoints;
    @Protobuf(order = 7)
    String rebirthPoem;
    @Protobuf(order = 8)
    int petsCarried;
    @Protobuf(order = 9)
    int equipCount;
}
