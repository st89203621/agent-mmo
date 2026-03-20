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
package com.iohao.mmo.equip.client;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.protocol.ResponseMessage;
import com.iohao.mmo.equip.cmd.EquipCmd;
import com.iohao.mmo.equip.proto.CreateEquipMessage;
import com.iohao.mmo.equip.proto.EquipMessage;
import com.iohao.mmo.equip.proto.EquipResetMessage;
import com.iohao.mmo.equip.proto.NewEquipMessage;
import lombok.experimental.UtilityClass;

/**
 * 装备模块，对外提供的访问 api
 *
 * @author 唐斌
 * @date 2023-08-15
 */
@UtilityClass
public class EquipExchange {
    /**
     * 鉴定装备
     *
     * @param equipResetMessage 装备id和增加的极品率
     * @param flowContext       flowContext
     * @return EquipMessage
     */
    public EquipMessage resetEquip(EquipResetMessage equipResetMessage, FlowContext flowContext) {
        CmdInfo cmdInfo = EquipCmd.of(EquipCmd.resetEquip);
        ResponseMessage responseMessage = flowContext.invokeModuleMessage(cmdInfo, equipResetMessage);
        return responseMessage.getData(EquipMessage.class);
    }

    /**
     * 通过材料创建新装备
     *
     * @param createEquipMessage 物品类型标识
     * @param flowContext        flowContext
     * @return NewEquipMessage
     */
    public NewEquipMessage createEquip(CreateEquipMessage createEquipMessage, FlowContext flowContext) {
        CmdInfo cmdInfo = EquipCmd.of(EquipCmd.createEquip);
        ResponseMessage responseMessage = flowContext.invokeModuleMessage(cmdInfo, createEquipMessage);
        return responseMessage.getData(NewEquipMessage.class);
    }
}
