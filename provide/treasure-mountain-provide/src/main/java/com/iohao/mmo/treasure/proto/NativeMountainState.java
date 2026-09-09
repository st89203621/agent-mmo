package com.iohao.mmo.treasure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import java.util.List;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeMountainState {
    public boolean success;
    public String message;
    public List<NativeMountainEntry> mountains;
    public NativeMountainRun run;
}
