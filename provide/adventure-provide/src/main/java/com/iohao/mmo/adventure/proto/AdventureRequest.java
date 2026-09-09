package com.iohao.mmo.adventure.proto;

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
public class AdventureRequest {
    String id;
    String dungeonId;
    String explorationId;
    String mapId;
    String riftId;
    String realmId;
    String trialId;
    int difficulty;
    int stageId;
    int stars;
    int wave;
    int kills;
    int damage;
    boolean victory;
    String location;
    String playerName;
}

