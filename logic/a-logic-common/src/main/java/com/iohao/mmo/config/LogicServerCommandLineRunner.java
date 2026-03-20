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
package com.iohao.mmo.config;

import com.iohao.game.widget.light.domain.event.DomainEventContext;
import com.iohao.game.widget.light.domain.event.DomainEventContextParam;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * @author 渔民小镇
 * @date 2023-07-28
 */
@Component
public class LogicServerCommandLineRunner implements CommandLineRunner {
    @Override
    public void run(String... args) {
        extractedSend();
    }

    private static void extractedSend() {
        // 领域事件上下文参数
        DomainEventContextParam contextParam = new DomainEventContextParam();
        // 启动事件驱动
        var domainEventContext = new DomainEventContext(contextParam);
        domainEventContext.startup();
    }
}
