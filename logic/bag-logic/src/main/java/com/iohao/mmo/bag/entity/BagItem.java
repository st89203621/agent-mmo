/*
 * ioGame
 * Copyright (C) 2021 - 2023  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
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
package com.iohao.mmo.bag.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Objects;

/**
 * 背包物品
 * <pre>
 *
 * </pre>
 *
 * @author 渔民小镇
 * @date 2023-08-04
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BagItem {
    /**
     * 背包物品 id
     * <pre>
     *     如果 id 与 itemTypeId 一致
     *     表示物品可叠加，比如一些药品可叠加存放
     *
     *     如果 id 与 itemTypeId 不一致
     *     表示物品不可叠加，每一件物品都需要分开存放；
     *     比如，装备、品质不同的药品等。
     * </pre>
     */
    @Id
    String id;
    /** 物品类型 id */
    String itemTypeId;
    /** 物品数量 */
    int quantity;

    public void addQuantity(int quantity) {
        this.quantity += quantity;
    }

    /**
     * 是否一个仓库
     *
     * @return true 表示类似仓库，物品可以叠加存放
     */
    public boolean isStash() {
        return Objects.equals(id, itemTypeId);
    }
}
