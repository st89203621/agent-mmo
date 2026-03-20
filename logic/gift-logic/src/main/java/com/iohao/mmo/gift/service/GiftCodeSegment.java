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
package com.iohao.mmo.gift.service;

import com.iohao.game.common.kit.HashIdKit;
import com.iohao.mmo.gift.GiftCodeType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GiftCodeSegment {
    /** 礼包类型 */
    GiftCodeType giftCodeType;
    /** 礼包码最后有效日期 */
    long lastDate;
    /** 礼包码 id */
    long giftCodeId;
    /** 礼包码 */
    String code;
    /** 可领取的最大数量 */
    long limit;
    /** 指定玩家领取 */
    long userId;
    /** true 有效合法的礼包码 */
    boolean valid;

    public GiftCodeSegment(String code) {
        /*
         * 解析礼包码。
         * 关于礼包码的生成可阅读 GiftCodeService.create 方法
         */
        long[] segment = HashIdKit.decode(code);

        int length = segment.length;
        if (length < 3) {
            return;
        }

        this.code = code;
        this.giftCodeType = GiftCodeType.valueOf(segment[0]);
        this.lastDate = segment[1];
        this.giftCodeId = segment[2];

        if (giftCodeType == GiftCodeType.batchLimit) {
            this.valid = length == 4;

            if (this.valid) {
                this.limit = segment[3];
            }
        }

        if (giftCodeType == GiftCodeType.user) {
            this.valid = length == 4;

            if (this.valid) {
                this.userId = segment[3];
            }
        }
    }

}
