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
package com.iohao.mmo.client.input;

import com.iohao.mmo.bag.proto.BagItemMessage;
import com.iohao.mmo.bag.proto.UseItemMessage;
import lombok.experimental.UtilityClass;

/**
 * 模拟测试辅助类
 *
 * @author 渔民小镇
 * @date 2023-08-06
 */
@UtilityClass
class BagInternalHelper {
    BagItemMessage ofBagItemMessage(String itemTypeId) {
        BagItemMessage bagItemMessage = new BagItemMessage();
        bagItemMessage.id = itemTypeId;
        bagItemMessage.itemTypeId = itemTypeId;
        bagItemMessage.quantity = 1;
        return bagItemMessage;
    }

    UseItemMessage ofUseItemMessage(String itemTypeId) {
        UseItemMessage useItemMessage = new UseItemMessage();
        useItemMessage.id = itemTypeId;
        useItemMessage.itemTypeId = itemTypeId;
        useItemMessage.quantity = 1;
        return useItemMessage;
    }
}
