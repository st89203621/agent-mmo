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
package com.iohao.mmo.person.client;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.protocol.ResponseMessage;
import com.iohao.mmo.person.cmd.PersonCmd;
import com.iohao.mmo.person.proto.PersonMessage;
import lombok.experimental.UtilityClass;

/**
 * 人物模块，对外提供的访问 api
 *
 * @author 渔民小镇
 * @date 2023-07-23
 */
@UtilityClass
public class PersonExchange {
    
    /**
     * 获取人物信息
     *
     * @param flowContext flowContext
     * @return PersonMessage
     */
    public PersonMessage getPerson(FlowContext flowContext) {
        CmdInfo cmdInfo = PersonCmd.of(PersonCmd.getPerson);
        ResponseMessage responseMessage = flowContext.invokeModuleMessage(cmdInfo);
        return responseMessage.getData(PersonMessage.class);
    }
}
