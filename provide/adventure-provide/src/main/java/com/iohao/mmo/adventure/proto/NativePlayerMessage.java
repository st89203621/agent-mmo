package com.iohao.mmo.adventure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativePlayerMessage {
    public long userId;
    public String nickname;
    public String profession;
    public String gender;
    public String appearanceJson;
    public float x;
    public float z;
    public float yaw;
    public int health;
    public int maxHealth;
    public int level;
    public String action;
    public long actionAt;
}
