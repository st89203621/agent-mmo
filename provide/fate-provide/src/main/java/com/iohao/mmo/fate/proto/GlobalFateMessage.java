package com.iohao.mmo.fate.proto;

import com.baidu.bjf.remoting.protobuf.annotation.Protobuf;
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
public class GlobalFateMessage {
    /** 累世总缘值 */
    @Protobuf(order = 1)
    int totalFate;
    /** 累世总信值 */
    @Protobuf(order = 2)
    int totalTrust;
    /** 当世缘值 */
    @Protobuf(order = 3)
    int currentFate;
    /** 当世信值 */
    @Protobuf(order = 4)
    int currentTrust;
    /** 缘信品级：金缘/浮缘/孤信/初入红尘 */
    @Protobuf(order = 5)
    String fateGrade;
    /** 当前世 */
    @Protobuf(order = 6)
    int worldIndex;
}
