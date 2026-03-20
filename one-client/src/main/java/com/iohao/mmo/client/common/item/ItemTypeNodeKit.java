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
package com.iohao.mmo.client.common.item;

import com.alibaba.fastjson2.JSONObject;
import com.iohao.mmo.common.provide.kit.JsonKit;
import lombok.experimental.UtilityClass;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * 客户端 - 物品通用工具
 *
 * @author 渔民小镇
 * @date 2023-08-15
 */
@UtilityClass
public class ItemTypeNodeKit {
    final Map<String, InternalItemTypeConfig> map = new HashMap<>();

    public void add(String itemTypeId, String name, String description) {
        var nodeConfig = new InternalItemTypeConfig(itemTypeId, name, description);

        map.put(itemTypeId, nodeConfig);
    }

    public String toString(ItemTypeNode itemTypeNode) {
        String itemTypeId = itemTypeNode.itemTypeId();
        var nodeConfig = map.get(itemTypeId);

        if (Objects.isNull(nodeConfig)) {
            nodeConfig = new InternalItemTypeConfig(itemTypeId
                    , "没有配置物品信息-" + itemTypeId
                    , itemTypeId
            );
        }

        String line = "\n物品信息：[%s x %s]；物品描述:%s";

        return String.format(line
                , nodeConfig.name()
                , itemTypeNode.quantity()
                , nodeConfig.description()
        );
    }

    public JSONObject toJSON(String itemTypeId) {
        var nodeConfig = map.get(itemTypeId);
        return JsonKit.toJSON(nodeConfig);
    }
}
