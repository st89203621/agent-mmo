package com.iohao.mmo.adventure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeCombatEvent {
    public long id;
    public String kind;
    public String sourceId;
    public String targetId;
    public String action;
    public int amount;
    public float x;
    public float z;
    public long time;
}
