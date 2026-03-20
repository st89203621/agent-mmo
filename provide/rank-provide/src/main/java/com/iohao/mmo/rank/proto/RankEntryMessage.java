package com.iohao.mmo.rank.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.baidu.bjf.remoting.protobuf.annotation.Protobuf;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

/**
 * 排行榜条目消息
 */
@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class RankEntryMessage {
    @Protobuf(fieldType = com.baidu.bjf.remoting.protobuf.FieldType.INT32, order = 1, required = false)
    int rank;

    @Protobuf(fieldType = com.baidu.bjf.remoting.protobuf.FieldType.INT64, order = 2, required = false)
    long playerId;

    @Protobuf(fieldType = com.baidu.bjf.remoting.protobuf.FieldType.STRING, order = 3, required = false)
    String playerName;

    @Protobuf(fieldType = com.baidu.bjf.remoting.protobuf.FieldType.INT32, order = 4, required = false)
    int level;

    @Protobuf(fieldType = com.baidu.bjf.remoting.protobuf.FieldType.INT64, order = 5, required = false)
    long value;

    @Protobuf(fieldType = com.baidu.bjf.remoting.protobuf.FieldType.STRING, order = 6, required = false)
    String rankType;
}

