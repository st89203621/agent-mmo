package com.iohao.mmo.flower.proto;

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
public class FlowerMessage {
    @Protobuf(order = 1)
    long playerId;
    /** 花名（根据品级自动生成） */
    @Protobuf(order = 2)
    String flowerName;
    /** 花的阶段：种子/萌芽/含苞/初绽/盛放/永恒 */
    @Protobuf(order = 3)
    String stage;
    /** 花色（由信值决定）：白/青/紫/金/彩 */
    @Protobuf(order = 4)
    String color;
    /** 已浇灌的总缘值 */
    @Protobuf(order = 5)
    int totalFateWatered;
    /** 已注入的总信值 */
    @Protobuf(order = 6)
    int totalTrustInfused;
    /** 花语（七世结束后AI生成） */
    @Protobuf(order = 7)
    String flowerVerse;
    /** 经历的世数 */
    @Protobuf(order = 8)
    int worldCount;
    /** 是否已绽放（七世完成） */
    @Protobuf(order = 9)
    boolean bloomed;
}
