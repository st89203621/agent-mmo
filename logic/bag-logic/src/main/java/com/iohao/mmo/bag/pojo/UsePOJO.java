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
package com.iohao.mmo.bag.pojo;

import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

import java.util.Map;

/**
 * @author 渔民小镇
 * @date 2023-08-06
 */
@ToString
@FieldDefaults(level = AccessLevel.PUBLIC)
public class UsePOJO {
    /** 业务场景 */
    String scene;
    /**
     * 使用项
     * <pre>
     *     key 为 itemTypeId；
     *     比如我们在强化某个装备时，通常是需要两个物品
     *     1 强化符
     *     2 需要强化的装备
     *
     *     而这个 key，则为我们提供了查找对应类型的可能，
     *     或者通过检测 key 是否存在，来做强化逻辑前的一些校验。
     *
     *     这里只举了一下例子，后期我们会扩展很多物品，而每种物品的使用效果是不同的，
     *     而要实现效果的不同，就需要到不同的逻辑代码中做对应的处理。
     * </pre>
     */
    Map<String, UseItemPOJO> useItemMap;

    public UseItemPOJO getUseItem() {
        return this.useItemMap.values().stream().findAny().orElse(null);
    }
}
