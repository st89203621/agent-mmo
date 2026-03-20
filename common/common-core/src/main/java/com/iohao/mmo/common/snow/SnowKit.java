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
package com.iohao.mmo.common.snow;

import com.iohao.mmo.common.snow.core.IdGenerator;
import com.iohao.mmo.common.snow.core.IdGeneratorException;
import com.iohao.mmo.common.snow.core.IdGeneratorOptions;
import com.iohao.mmo.common.snow.core.impl.DefaultIdGenerator;
import lombok.Setter;
import lombok.experimental.UtilityClass;

/**
 * 雪花工具
 *
 * @author 渔民小镇
 * @date 2023-07-27
 */
@UtilityClass
public class SnowKit {
    IdGeneratorOptions idGeneratorOptions = createIdGeneratorOptions();

    @Setter
    IdGenerator idGenerator = new DefaultIdGenerator(idGeneratorOptions);

    /**
     * 创建ID生成器配置
     * 设置合适的workerId和workerIdBitLength以避免ID冲突
     */
    private static IdGeneratorOptions createIdGeneratorOptions() {
        IdGeneratorOptions options = new IdGeneratorOptions();
        // 增加机器码位长，支持更多机器
        options.workerIdBitLength = 6; // 支持64个不同的机器码
        // 设置当前实例的机器码，可以通过系统属性或环境变量配置
        String workerIdStr = System.getProperty("snow.workerId",
                             System.getenv("SNOW_WORKER_ID"));
        if (workerIdStr != null) {
            options.workerId = Short.parseShort(workerIdStr);
        } else {
            // 如果没有配置，使用当前时间的低位作为workerId
            options.workerId = (short) (System.currentTimeMillis() % 63 + 1);
        }
        return options;
    }

    public long next() throws IdGeneratorException {
        return idGenerator.next();
    }

    public String nextToString() {
        return String.valueOf(next());
    }
}
