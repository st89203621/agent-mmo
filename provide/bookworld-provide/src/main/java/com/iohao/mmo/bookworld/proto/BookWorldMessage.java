package com.iohao.mmo.bookworld.proto;

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
public class BookWorldMessage {
    @Protobuf(order = 1)
    String bookId;
    @Protobuf(order = 2)
    String title;
    @Protobuf(order = 3)
    String author;
    @Protobuf(order = 4)
    String category;
    @Protobuf(order = 5)
    String loreSummary;
    @Protobuf(order = 6)
    String artStyle;
    @Protobuf(order = 7)
    String colorPalette;
    @Protobuf(order = 8)
    String languageStyle;
    @Protobuf(order = 9)
    String coverUrl;
    @Protobuf(order = 10)
    boolean isPreprocessed;
    /** 缘值获取效率倍率 */
    @Protobuf(order = 11)
    double fateMultiplier;
    /** 信值获取效率倍率 */
    @Protobuf(order = 12)
    double trustMultiplier;
    /** 核心主题标签 */
    @Protobuf(order = 13)
    String themeTag;
}
