package com.iohao.mmo.enchant.proto;

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
public class EnchantMessage {
    @Protobuf(order = 1)
    String equipId;
    
    @Protobuf(order = 2)
    String runeId;
    
    @Protobuf(order = 3)
    int enchantLevel;
    
    @Protobuf(order = 4)
    int attributeBonus;
    
    @Protobuf(order = 5)
    boolean success;
    
    @Protobuf(order = 6)
    int guaranteeCount;
}

