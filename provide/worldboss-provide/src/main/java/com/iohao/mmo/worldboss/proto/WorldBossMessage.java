package com.iohao.mmo.worldboss.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

import java.util.List;

@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class WorldBossMessage {
    String bossId;
    String bossName;
    int bossLevel;
    long maxHp;
    long currentHp;
    int attack;
    int defense;
    double x;
    double y;
    String mapId;
    int status;
    long spawnTime;
    long nextSpawnTime;
    List<BossSkillMessage> skills;
    List<DropItemMessage> dropItems;
}

