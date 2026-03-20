/*
 * ioGame
 * Copyright (C) 2021 - 2024  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
 * # iohao.com . 渔民小镇
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.iohao.mmo.gift.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import com.iohao.mmo.gift.GiftCodeType;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

/**
 * 礼包码信息
 *
 * @author 渔民小镇
 * @date 2024-02-17
 */
@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class GiftCodeMessage {
    /** 礼包码类型 {@link GiftCodeType} */
    GiftCodeType giftCodeType;
    /** 礼包码最后有效日期 - EpochDay */
    long lastLocalDateEpochDay;
    /** 礼包数量。当 giftType 为 {@link GiftCodeType#batchLimit} 时，这里才需要有值 */
    long limit;
    /** 指定玩家领取。当 giftType 为 {@link GiftCodeType#user} 时，这里才需要有值 */
    long userId;

    /** 礼包码 */
    String code;
    /** 已经领取的数量 */
    long quantity;
    /** 礼包 id */
    String giftBagId;
}
