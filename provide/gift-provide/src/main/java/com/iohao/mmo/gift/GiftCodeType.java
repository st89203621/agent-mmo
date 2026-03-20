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
package com.iohao.mmo.gift;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import lombok.Getter;
import lombok.ToString;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Getter
@ToString
@ProtobufClass
public enum GiftCodeType {
    empty(-1, "empty"),
    /** 批量礼包码 - 无限量礼包 */
    batch(0, "无限量礼包 - 可重复使用"),
    /** 限量礼包 */
    batchLimit(1, "限量礼包 - 可重复使用"),
    /** 指定玩家可领取的礼包 */
    user(2, "指定玩家可领取的礼包");

    final long index;
    final String name;

    GiftCodeType(long index, String name) {
        this.index = index;
        this.name = name;
    }

    public static GiftCodeType valueOf(long index) {

        for (GiftCodeType giftCodeType : values()) {
            if (giftCodeType.index == index) {
                return giftCodeType;
            }
        }

        return GiftCodeType.empty;
    }

    public boolean isEmpty() {
        return this == GiftCodeType.empty;
    }
}

