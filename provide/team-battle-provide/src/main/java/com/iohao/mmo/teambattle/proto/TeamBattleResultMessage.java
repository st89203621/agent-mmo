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
public class TeamBattleResultMessage {
    @Protobuf(order = 1)
    String battleId;
    @Protobuf(order = 2)
    boolean victory;
    @Protobuf(order = 3)
    int fateReward;
    @Protobuf(order = 4)
    int trustReward;
    @Protobuf(order = 5)
    String mvpPlayerName;
    @Protobuf(order = 6)
    int ratingChange;
}
