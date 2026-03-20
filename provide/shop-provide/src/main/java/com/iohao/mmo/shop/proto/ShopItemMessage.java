package com.iohao.mmo.shop.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Map;

@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class ShopItemMessage {
    String id;
    String name;
    String icon;
    String description;
    int price;
    String currency;
    String category;
    String quality;
    boolean isHot;
    int stock;
    List<String> contents;
    Map<String, Integer> attributes;
    EffectMessage effect;
    int duration;
}

