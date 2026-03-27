package com.iohao.mmo.teambattle.proto;

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
public class TeamMessage {
    @Protobuf(order = 1)
    String teamId;
    @Protobuf(order = 2)
    long leaderId;
    @Protobuf(order = 3)
    String leaderName;
    @Protobuf(order = 4)
    String memberIds;
    @Protobuf(order = 5)
    String memberNames;
    @Protobuf(order = 6)
    int teamSize;
    @Protobuf(order = 7)
    String status;
    @Protobuf(order = 8)
    int totalPower;
}
