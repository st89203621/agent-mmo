package com.iohao.mmo.adventure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeEnemyMessage {
    public String id;
    public String name;
    public int archetype;
    public int realm;
    public boolean boss;
    public float x;
    public float z;
    public float spawnX;
    public float spawnZ;
    public int health;
    public int maxHealth;
    public long respawnAt;
    public long castEndsAt;
    public float castX;
    public float castZ;
    public float castRadius;
    public int castStyle;
    public long targetUserId;
}
