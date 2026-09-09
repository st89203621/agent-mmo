package com.iohao.mmo.coexplore.proto;

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
public class CoexploreSessionMessage {
    @Protobuf(order = 1)
    String sessionId;
    @Protobuf(order = 2)
    long hostId;
    @Protobuf(order = 3)
    String hostName;
    @Protobuf(order = 4)
    long guestId;
    @Protobuf(order = 5)
    String guestName;
    @Protobuf(order = 6)
    String status;
    @Protobuf(order = 7)
    int currentRound;
    @Protobuf(order = 8)
    String currentPhase;
    @Protobuf(order = 9)
    int hostFateValue;
    @Protobuf(order = 10)
    int guestFateValue;
    @Protobuf(order = 11)
    String eventsJson;
}
