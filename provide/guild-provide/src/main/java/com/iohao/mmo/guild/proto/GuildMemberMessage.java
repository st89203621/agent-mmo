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
public class GuildMemberMessage {
    @Protobuf(fieldType = FieldType.INT64, order = 1, required = false)
    long playerId;

    @Protobuf(fieldType = FieldType.STRING, order = 2, required = false)
    String playerName;

    /** 职位: LEADER/ELDER/MEMBER */
    @Protobuf(fieldType = FieldType.STRING, order = 3, required = false)
    String position;

    /** 贡献值 */
    @Protobuf(fieldType = FieldType.INT64, order = 4, required = false)
    long contribution;

    /** 建设值 */
    @Protobuf(fieldType = FieldType.INT64, order = 5, required = false)
    long construction;

    /** 荣誉值 */
    @Protobuf(fieldType = FieldType.INT64, order = 6, required = false)
    long honor;

    @Protobuf(fieldType = FieldType.INT64, order = 7, required = false)
    long joinTime;
}
