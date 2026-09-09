package com.iohao.mmo.adventure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeLandmarkMessage {
    public String id;
    public String title;
    public float x;
    public float z;
    public boolean collected;
    public boolean available;
    public int bit;
    public String kind;
}
