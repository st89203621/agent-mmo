package com.iohao.mmo.arena.proto;

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
public class ArenaPlayerMessage {
    long playerId;
    String playerName;
    int level;
    long power;
    int wins;
    int losses;
    int rating;
    int rank;
    long lastBattleTime;
    boolean canBattle;
}

