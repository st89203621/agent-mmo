package com.iohao.mmo.trade.proto;

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
public class TradeMessage {
    @Protobuf(order = 1)
    String tradeId;
    @Protobuf(order = 2)
    long sellerId;
    @Protobuf(order = 3)
    String sellerName;
    @Protobuf(order = 4)
    String itemId;
    @Protobuf(order = 5)
    String itemName;
    @Protobuf(order = 6)
    int quantity;
    @Protobuf(order = 7)
    int price;
    @Protobuf(order = 8)
    String currency;
    @Protobuf(order = 9)
    long createTime;
    @Protobuf(order = 10)
    String status;
}
