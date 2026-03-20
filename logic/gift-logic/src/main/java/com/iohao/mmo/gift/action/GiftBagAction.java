/*
 * ioGame
 * Copyright (C) 2021 - 2024  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
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
package com.iohao.mmo.gift.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.gift.cmd.GiftBagCmd;
import com.iohao.mmo.gift.entity.GiftBag;
import com.iohao.mmo.gift.mapper.GiftBagMapper;
import com.iohao.mmo.gift.proto.GiftBagMessage;
import com.iohao.mmo.gift.service.GiftBagService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Slf4j
@Component
@ActionController(GiftBagCmd.cmd)
public class GiftBagAction {

    @Resource
    GiftBagService giftBagService;

    @ActionMethod(GiftBagCmd.addGiftBag)
    public boolean internalAddGiftBag(GiftBagMessage giftBagMessage) {

        GiftBag giftBag = GiftBagMapper.ME.convert(giftBagMessage);

        this.giftBagService.save(giftBag);

        return true;
    }

    @ActionMethod(GiftBagCmd.listGiftBag)
    public List<GiftBagMessage> internalListGiftBag() {

        List<GiftBag> giftBags = this.giftBagService.listGiftBag();

        return GiftBagMapper.ME.convertGiftBagMessage(giftBags);
    }

    @ActionMethod(GiftBagCmd.openGiftBag)
    public void internalOpenGiftBag(String giftBagId, FlowContext flowContext) {

        GiftBag giftBag = this.giftBagService.getGiftBag(giftBagId);

        if (Objects.isNull(giftBag)) {
            return;
        }

        this.giftBagService.openGiftBag(giftBag, flowContext);
    }
}