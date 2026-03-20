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
package com.iohao.mmo.bag.service;

import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import com.iohao.mmo.bag.entity.Bag;
import com.iohao.mmo.bag.entity.BagItem;
import com.iohao.mmo.bag.repository.BagRepository;
import com.iohao.mmo.common.config.GameCode;
import lombok.AllArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * @author 渔民小镇
 * @date 2023-08-04
 */
@Service
@AllArgsConstructor
public class BagService {
    final MongoTemplate mongoTemplate;
    final BagRepository bagRepository;

    public Bag ofBag(long userId) {

        Optional<Bag> bagOptional = bagRepository.findById(userId);
        if (bagOptional.isPresent()) {
            return bagOptional.get();
        }

        Bag bag = new Bag();
        bag.setId(userId);
        bag.setItemMap(new HashMap<>());

        bagRepository.save(bag);

        return bag;
    }

    public List<BagItem> incrementItems(List<BagItem> incrementItems, long userId) {
        // merge 让多个相同的物品做整合
        Map<String, BagItem> bagItemMessageMap = new HashMap<>();
        incrementItems.forEach(incrementItem -> {

            String key = incrementItem.getItemTypeId();
            BagItem bagItem = bagItemMessageMap.get(key);

            if (Objects.isNull(bagItem)) {
                bagItemMessageMap.put(key, incrementItem);
            } else {
                int quantity = incrementItem.getQuantity();
                bagItem.addQuantity(Math.abs(quantity));
            }

        });

        // 物品变更
        return bagItemMessageMap.values().stream()
                .filter(bagItem -> bagItem.getQuantity() > 0)
                .map(bagItem -> this.incrementItem(bagItem, userId))
                .toList();
    }

    public BagItem incrementItem(BagItem incrementItem, long userId) {
        int quantity = incrementItem.getQuantity();
        GameCode.quantityNotEnough.assertTrue(quantity > 0);

        Bag bag = ofBag(userId);
        Map<String, BagItem> itemMap = bag.getItemMap();

        String bagItemId = incrementItem.getId();
        BagItem bagItem = itemMap.get(bagItemId);

        if (Objects.isNull(bagItem)) {
            bagItem = incrementItem;
            itemMap.put(bagItemId, bagItem);
            bagItem.setQuantity(0);
        }

        // 通过 itemType 来判断，背包物品是否可叠加
        if (bagItem.isStash()) {
            bagItem.addQuantity(quantity);
        } else {
            bagItem.setQuantity(1);
        }

        bagRepository.save(bag);

        return bagItem;
    }

    public BagItem decrementItem(BagItem decrementItem, long userId) {
        Bag bag = ofBag(userId);
        Map<String, BagItem> itemMap = bag.getItemMap();

        // 查询背包物品
        String bagItemId = decrementItem.getId();
        BagItem bagItem = itemMap.get(bagItemId);
        ActionErrorEnum.dataNotExist.assertNonNull(bagItem);

        // 数量检测
        int quantity = decrementItem.getQuantity();
        GameCode.quantityNotEnough.assertTrue(bagItem.getQuantity() >= quantity);

        bagItem.addQuantity(-quantity);

        if (bagItem.getQuantity() == 0) {
            itemMap.remove(bagItemId);
        }

        bagRepository.save(bag);

        return bagItem;
    }

    public boolean contains(List<BagItem> itemList, long userId) {
        Bag bag = ofBag(userId);
        Map<String, BagItem> itemMap = bag.getItemMap();

        for (BagItem item : itemList) {
            String bagItemId = item.getId();
            BagItem bagItem = itemMap.get(bagItemId);
            if (Objects.isNull(bagItem)) {
                return false;
            }

            // 数量检测
            if (bagItem.getQuantity() < item.getQuantity()) {
                return false;
            }
        }

        return true;
    }
}
