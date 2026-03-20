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
package com.iohao.mmo.bag.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

import java.util.Objects;

/**
 * 使用物品的具体信息
 *
 * @author 渔民小镇
 * @date 2023-08-06
 */
@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class UseItemMessage {
    /** 背包物品 id */
    String id;
    /** 物品类型 id */
    String itemTypeId;
    /** 使用数量 */
    int quantity;

    /**
     * 数据验证
     * <pre>
     *     id 与 itemTypeId 相同，表示简单物品，是允许有数量的。
     *
     *     当 id 与 itemTypeId 不相同时，则只能使用 1 表示。
     * </pre>
     *
     * @return true 表示验证通过
     */
    public boolean verify() {
        if (Objects.equals(id, itemTypeId)) {
            //
            return quantity > 0;
        }

        quantity = 1;
        return true;
    }
}
