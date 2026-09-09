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
package com.iohao.mmo.bag.region;

import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import lombok.NonNull;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * @author 渔民小镇
 * @date 2023-08-06
 */
@Component
public class UseRegion {
    /**
     * <pre>
     *     key : 业务场景
     *     value : 物品使用逻辑处理实现类
     * </pre>
     */
    Map<String, UseProcess> map = new ConcurrentHashMap<>();

    /**
     * 添加物品使用逻辑处理类
     *
     * @param useProcess 物品使用逻辑处理实现类
     */
    public void addUseProcess(@NonNull UseProcess useProcess) {
        String scene = useProcess.getScene();
        Objects.requireNonNull(scene);
        map.put(scene, useProcess);
    }

    /**
     * 执行物品使用逻辑
     *
     * @param context context
     */
    public void process(UseContext context) {
        // 通过业务场景，得到对应的物品使用逻辑处理实现类
        String scene = context.getScene();
        UseProcess useProcess = map.get(scene);
        ActionErrorEnum.classNotExist.assertNonNull(useProcess);
        // 开始处理
        useProcess.process(context);
    }
}
