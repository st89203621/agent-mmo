package com.iohao.mmo.adventure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeRewardMessage {
    public String id;
    public int gold;
    public int experience;
    public java.util.List<NativeRewardItem> items = new java.util.ArrayList<>();
    public String equipmentId;
}
