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
package com.iohao.mmo.common.core.flow;

import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.protocol.external.ResponseCollectExternalItemMessage;
import com.iohao.mmo.common.config.MyExternalBizCodeCont;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;

import java.util.Objects;

/**
 * 自定义 FlowContext
 * <pre>
 *
 * </pre>
 *
 * @author 渔民小镇
 * @date 2023-07-24
 */
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MyFlowContext extends FlowContext {
    MyAttachment attachment;

    @Override
    @SuppressWarnings("unchecked")
    public MyAttachment getAttachment() {

        if (Objects.isNull(this.attachment)) {
            this.attachment = this.getAttachment(MyAttachment.class);
        }

        return attachment;
    }

    public String getUserIp() {
        long userId = this.getUserId();

        return this.invokeExternalModuleCollectMessage(MyExternalBizCodeCont.userIp, userId)
                .optionalAnySuccess()
                // 得到返回值
                .map(ResponseCollectExternalItemMessage::getData)
                // 转为 String
                .map(Objects::toString)
                // 如果没获取到给个空串，调用方就不需要做 null 判断了。
                .orElse("");
    }
}