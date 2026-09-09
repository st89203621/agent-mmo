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
package com.iohao.mmo.common.processor.hook;

import com.iohao.game.action.skeleton.core.BarSkeleton;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.core.flow.attr.FlowAttr;
import com.iohao.game.action.skeleton.kit.ExecutorSelectKit;
import com.iohao.game.bolt.broker.core.common.processor.hook.RequestMessageClientProcessorHook;
import com.iohao.mmo.common.annotation.IoThread;

import java.util.Objects;

/**
 * @author 渔民小镇
 * @date 2023-07-24
 */
public final class MyRequestMessageClientProcessorHook implements RequestMessageClientProcessorHook {

    @Override
    public void processLogic(BarSkeleton barSkeleton, FlowContext flowContext) {
        var actionCommand = flowContext.getActionCommand();
        var annotation = actionCommand.getAnnotation(IoThread.class);
        // 使用虚拟线程处理业务
        if (Objects.nonNull(annotation)) {
            var threadExecutor = flowContext.getVirtualThreadExecutor();
            flowContext.option(FlowAttr.threadExecutor, threadExecutor);
            threadExecutor.execute(() -> barSkeleton.handle(flowContext));
            return;
        }

        var execute = ExecutorSelectKit.processLogic(barSkeleton, flowContext);
        if (!execute) {
            // 在当前线程中执行业务框架
            barSkeleton.handle(flowContext);
        }
    }
}
