package com.iohao.mmo.treasure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeMountainEntry {
    public int mountain;
    public String name;
    public String description;
    public boolean claimedToday;
    public boolean active;
    public long rewardCoins;
    public long rewardHonor;
    public int rewardGoldenBeans;
}
