package com.iohao.mmo.guild.proto;

import com.baidu.bjf.remoting.protobuf.FieldType;
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
public class GuildMessage {
    @Protobuf(fieldType = FieldType.STRING, order = 1, required = false)
    String guildId;

    @Protobuf(fieldType = FieldType.STRING, order = 2, required = false)
    String name;

    @Protobuf(fieldType = FieldType.INT64, order = 3, required = false)
    long leaderId;

    @Protobuf(fieldType = FieldType.STRING, order = 4, required = false)
    String leaderName;

    @Protobuf(fieldType = FieldType.INT32, order = 5, required = false)
    int memberCount;

    @Protobuf(fieldType = FieldType.INT32, order = 6, required = false)
    int maxMembers;

    @Protobuf(fieldType = FieldType.INT32, order = 7, required = false)
    int level;

    @Protobuf(fieldType = FieldType.STRING, order = 8, required = false)
    String notice;

    @Protobuf(fieldType = FieldType.INT64, order = 9, required = false)
    long totalConstruction;

    @Protobuf(fieldType = FieldType.INT64, order = 10, required = false)
    long totalHonor;
}
