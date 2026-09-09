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

import com.iohao.mmo.gift.entity.GiftCodeUser;
import com.iohao.mmo.gift.repository.GiftCodeUserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Optional;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Service
@AllArgsConstructor
public class GiftCodeUserService {
    final GiftCodeUserRepository giftCodeUserRepository;

    public GiftCodeUser ofGiftCodeUser(long userId) {

        Optional<GiftCodeUser> giftCodeUserOptional = giftCodeUserRepository.findById(userId);
        if (giftCodeUserOptional.isPresent()) {
            return giftCodeUserOptional.get();
        }

        GiftCodeUser giftCodeUser = new GiftCodeUser();
        giftCodeUser.setId(userId);
        giftCodeUser.setGiftCodeRecordMap(new HashMap<>());

        giftCodeUserRepository.save(giftCodeUser);

        return giftCodeUser;
    }

    public void save(GiftCodeUser giftCodeUser) {
        this.giftCodeUserRepository.save(giftCodeUser);
    }
}
