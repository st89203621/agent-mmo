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
package com.iohao.mmo.gift.config;

import com.iohao.game.common.kit.CollKit;
import com.iohao.mmo.common.provide.item.ItemTypeIdConst;
import com.iohao.mmo.gift.entity.GiftBag;
import com.iohao.mmo.gift.service.GiftBagService;
import jakarta.annotation.Resource;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Slf4j
@Component
@AllArgsConstructor
public class GiftCommandLineRunner implements CommandLineRunner {
    @Resource
    MongoTemplate mongoTemplate;
    @Resource
    GiftBagService giftBagService;

    @Override
    public void run(String... args) {
        // 初始化一些礼包数据
        initGiftBag();
    }

    private void initGiftBag() {

        List<GiftBag> giftBags = giftBagService.listGiftBag();

        if (CollKit.notEmpty(giftBags)) {
            return;
        }

        log.info("初始化一些礼包数据");

        GiftBag giftBag = new GiftBag()
                .addAttachment(ItemTypeIdConst.expId, 2)
                .addAttachment(ItemTypeIdConst.equipWeaponBook10, 1)
                .addAttachment(ItemTypeIdConst.iron10, 1);

        this.giftBagService.save(giftBag);


        GiftBag giftBag1 = new GiftBag()
                .addAttachment(ItemTypeIdConst.expId, 2);

        this.giftBagService.save(giftBag1);
    }
}
