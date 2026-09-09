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
package com.iohao.mmo.common.provide.kit;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.alibaba.fastjson2.JSONWriter;
import lombok.experimental.UtilityClass;

import java.util.Objects;

/**
 * @author 渔民小镇
 * @date 2023-08-01
 */
@UtilityClass
public class JsonKit {
    /**
     * 打印一些信息，当对象属性较多时，json 格式数据更清晰
     *
     * @param value value
     * @return jsonFormat
     */
    public String toJsonString(Object value) {
        return JSON.toJSONString(value, JSONWriter.Feature.PrettyFormat);
    }

    public JSONObject toJSON(Object value) {
        return JSONObject.from(value);
    }

    public JSONObject merge(JSONObject... jsonObjects) {
        JSONObject json = new JSONObject();

        for (JSONObject jsonObject : jsonObjects) {
            if (Objects.nonNull(jsonObject)) {
                json.putAll(jsonObject);
            }
        }

        return json;
    }
}
