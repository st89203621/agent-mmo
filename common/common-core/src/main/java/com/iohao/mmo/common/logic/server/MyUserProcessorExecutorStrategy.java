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
package com.iohao.mmo.common.logic.server;

import com.iohao.game.bolt.broker.core.aware.UserProcessorExecutorAware;
import com.iohao.game.bolt.broker.core.common.UserProcessorExecutorStrategy;
import com.iohao.game.common.kit.concurrent.DaemonThreadFactory;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 自定义 UserProcessor 构建 Executor 的策略
 *
 * @author 渔民小镇
 * @date 2023-08-15
 */
@Slf4j
@Deprecated
public class MyUserProcessorExecutorStrategy implements UserProcessorExecutorStrategy {
    final AtomicInteger id = new AtomicInteger();
    final Executor commonExecutor;

    Map<String, Executor> executorMap = new ConcurrentHashMap<>();

    public MyUserProcessorExecutorStrategy() {
        int corePoolSize = Runtime.getRuntime().availableProcessors();
        int maximumPoolSize = corePoolSize << 1;
        this.commonExecutor = createExecutor("common", corePoolSize, maximumPoolSize);
    }

    @Override
    public Executor getExecutor(UserProcessorExecutorAware userProcessorExecutorAware) {
        String userProcessorName = userProcessorExecutorAware.getClass().getSimpleName();

        return switch (userProcessorName) {
            case "RequestMessageClientProcessor", "SettingUserIdMessageExternalProcessor" ->
                    this.createExecutor(userProcessorName);
            // 其他类型的消息处理共用一个池
            default -> this.commonExecutor;
        };
    }

    Executor createExecutor(String userProcessorName) {
        int corePoolSize = Runtime.getRuntime().availableProcessors();
        return createExecutor(userProcessorName, corePoolSize, corePoolSize);
    }

    Executor createExecutor(String userProcessorName, int corePoolSize, int maximumPoolSize) {

        Executor executor = executorMap.get(userProcessorName);
        if (Objects.isNull(executor)) {
            String namePrefix = String.format("Executor-%s-%d"
                    , userProcessorName
                    , id.incrementAndGet());

            DaemonThreadFactory threadFactory = new DaemonThreadFactory(namePrefix);
            executor = new ThreadPoolExecutor(
                    corePoolSize, maximumPoolSize,
                    60L, TimeUnit.SECONDS,
                    new LinkedBlockingQueue<>(),
                    threadFactory);

            executor = executorMap.putIfAbsent(userProcessorName, executor);

            if (Objects.isNull(executor)) {
                executor = executorMap.get(userProcessorName);
            }

            // 小预热
            for (int i = 0; i < corePoolSize; i++) {
                executor.execute(() -> {
                });
            }
        }

        return executor;
    }
}
