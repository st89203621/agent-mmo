package com.iohao.mmo.title.proto;

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
public class TitleMessage {
    @Protobuf(fieldType = FieldType.STRING, order = 1, required = false)
    String titleId;

    @Protobuf(fieldType = FieldType.STRING, order = 2, required = false)
    String name;

    /** 称号类型: PRESTIGE(声望), POWER(威望), HONOR(荣誉) */
    @Protobuf(fieldType = FieldType.STRING, order = 3, required = false)
    String titleType;

    @Protobuf(fieldType = FieldType.INT32, order = 4, required = false)
    int requiredLevel;

    @Protobuf(fieldType = FieldType.STRING, order = 5, required = false)
    String description;

    @Protobuf(fieldType = FieldType.BOOL, order = 6, required = false)
    boolean equipped;

    /** 属性加成JSON */
    @Protobuf(fieldType = FieldType.STRING, order = 7, required = false)
    String bonusJson;
}
