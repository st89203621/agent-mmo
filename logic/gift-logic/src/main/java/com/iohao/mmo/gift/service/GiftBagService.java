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
package com.iohao.mmo.gift.service;

import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.common.kit.CollKit;
import com.iohao.mmo.bag.client.BagExchange;
import com.iohao.mmo.bag.proto.BagItemMessage;
import com.iohao.mmo.common.provide.proto.AttachmentMessage;
import com.iohao.mmo.gift.entity.GiftBag;
import com.iohao.mmo.gift.mapper.GiftBagMapper;
import com.iohao.mmo.gift.repository.GiftBagRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Service
@AllArgsConstructor
public class GiftBagService {
    final GiftBagRepository giftBagRepository;

    public void save(GiftBag giftBag) {
        this.giftBagRepository.save(giftBag);
    }

    public List<GiftBag> listGiftBag() {
        return this.giftBagRepository.findAll();
    }

    public GiftBag getGiftBag(String giftBagId) {
        return this.giftBagRepository.findById(giftBagId).orElse(null);
    }

    public void openGiftBag(GiftBag giftBag, FlowContext flowContext) {
        var attachments = giftBag.getAttachments();

        // 将附件转为背包物品
        List<BagItemMessage> list = attachments.stream()
                .map(GiftBagMapper.ME::convert)
                .toList();

        // 调用背包模块，增加物品
        BagExchange.incrementItems(list, flowContext);
    }
}
