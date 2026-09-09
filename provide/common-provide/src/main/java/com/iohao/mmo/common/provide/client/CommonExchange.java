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
package com.iohao.mmo.common.provide.client;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.protocol.wrapper.ByteValueList;
import com.iohao.game.action.skeleton.protocol.wrapper.WrapperKit;
import com.iohao.game.common.kit.CollKit;
import com.iohao.mmo.common.provide.cmd.CommonCmd;
import com.iohao.mmo.common.provide.proto.ShowItemMessage;
import lombok.experimental.UtilityClass;

import java.util.List;
import java.util.Objects;
import java.util.function.Supplier;

/**
 * 用于界面显示的物品消息，类似单次跑马灯
 *
 * @author 渔民小镇
 * @date 2023-08-15
 */
@UtilityClass
public class CommonExchange {
    public void broadcastShowItem(Supplier<List<ShowItemMessage>> supplier, long userId) {
        List<ShowItemMessage> itemMessages = supplier.get();

        if (CollKit.isEmpty(itemMessages)) {
            return;
        }

        CmdInfo cmdInfo = CommonCmd.of(CommonCmd.broadcastShowItem);
        ByteValueList byteValueList = WrapperKit.ofListByteValue(itemMessages);

        ExchangeKit.broadcast(cmdInfo, byteValueList, userId);
    }

    /**
     * 物品获得通知
     * <pre>
     *     用于界面显示的物品消息
     *     使用 supplier 有个好处，就是当游戏不需要这个物品获得通知这个推送业务时，
     *     只需要在这个方法做控制就好的，
     *     并且还能减少转换，也就是不调用 supplier.get() 方法。
     *
     *     在调用端也不需要做任何改动，保留原样即可，
     *     由于不转换，因此也就没损耗。
     * </pre>
     *
     * @param supplier    supplier
     * @param flowContext flowContext
     */
    public void broadcastShowItem(Supplier<List<ShowItemMessage>> supplier, FlowContext flowContext) {
        List<ShowItemMessage> itemMessages = supplier.get();

        if (CollKit.isEmpty(itemMessages)) {
            return;
        }

        CmdInfo cmdInfo = CommonCmd.of(CommonCmd.broadcastShowItem);
        ByteValueList byteValueList = WrapperKit.ofListByteValue(itemMessages);

        flowContext.broadcastMe(cmdInfo, byteValueList);
    }

    public void broadcastSingleShowItem(Supplier<ShowItemMessage> supplier, FlowContext flowContext) {
        ShowItemMessage itemMessages = supplier.get();

        if (Objects.isNull(itemMessages)) {
            return;
        }

        CmdInfo cmdInfo = CommonCmd.of(CommonCmd.broadcastShowItem);
        ByteValueList byteValueList = WrapperKit.ofListByteValue(List.of(itemMessages));

        flowContext.broadcastMe(cmdInfo, byteValueList);
    }
}
