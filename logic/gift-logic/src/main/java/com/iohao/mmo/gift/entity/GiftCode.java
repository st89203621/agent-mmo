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
package com.iohao.mmo.gift.entity;

import com.iohao.mmo.gift.GiftCodeType;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;


/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GiftCode {
    /** 礼包码唯一 id */
    @Id
    long id;
    /** 礼包码类型 */
    GiftCodeType giftCodeType;
    /** 礼包码最后有效日期（格式 yyyy-MM-dd 的毫秒） */
    long lastDate;
    /** 礼包数量（可领取的最大上限）。当 giftType 为 {@link GiftCodeType#batchLimit} 时才需要有值 */
    long limit;
    /** 指定玩家领取。当 giftType 为 {@link GiftCodeType#user} 时才需要有值 */
    long userId;

    /** 礼包码 */
    String code;
    /** 已经领取的数量 */
    long quantity;
    /** 礼包 id */
    String giftBagId;

    public void incrementQuantity() {
        this.quantity++;
    }

    /**
     * @return true 表示还可以领取
     */
    public boolean hasLimit() {
        return this.limit > this.quantity;
    }

    @Override
    public String toString() {
        String format = """
                                
                礼包码类型 : %s - %s
                礼包码最后有效日期 : %s
                礼包数量 : %s
                指定玩家领取 : %s
                礼包码 : %s
                """;

        GiftCodeType giftCodeType = this.getGiftCodeType();

        return String.format(format,
                giftCodeType.getIndex(), giftCodeType.getName(),
                this.getLastDate(),
                this.getLimit(),
                this.getUserId(),
                this.getCode()
        );
    }
}
