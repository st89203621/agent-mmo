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
package com.iohao.mmo.mail.client;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.protocol.wrapper.ByteValueList;
import com.iohao.game.action.skeleton.protocol.wrapper.WrapperKit;
import com.iohao.game.common.kit.CollKit;
import com.iohao.mmo.common.provide.client.ExchangeKit;
import com.iohao.mmo.mail.cmd.MailCmd;
import com.iohao.mmo.mail.proto.MailMessage;
import lombok.experimental.UtilityClass;

import java.util.List;
import java.util.Objects;

/**
 * 邮件模块，对外提供的访问 api
 * <pre>
 *     应用场景：后台、触发某个系统的活动奖励
 * </pre>
 *
 * @author 渔民小镇
 * @date 2023-08-15
 */
@UtilityClass
public class MailExchange {
    public void addEmail(MailMessage mailMessage, long userId) {
        Objects.requireNonNull(mailMessage);

        List<MailMessage> mailMessageList = List.of(mailMessage);
        addEmail(mailMessageList, userId);
    }

    public void addEmail(List<MailMessage> mailMessageList, long userId) {

        if (CollKit.isEmpty(mailMessageList)) {
            return;
        }

        CmdInfo cmdInfo = MailCmd.of(MailCmd.addMail);
        ByteValueList byteValueList = WrapperKit.ofListByteValue(mailMessageList);
        ExchangeKit.invokeModuleVoidMessage(cmdInfo, byteValueList, userId);
    }
}
