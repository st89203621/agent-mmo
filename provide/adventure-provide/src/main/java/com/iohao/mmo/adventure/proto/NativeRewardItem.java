package com.iohao.mmo.adventure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeRewardItem {
    public String itemTypeId;
    public String name;
    public int quantity;
    public boolean important;
}
