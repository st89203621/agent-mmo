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
import com.iohao.game.common.kit.HashIdKit;
import com.iohao.game.common.kit.RandomKit;
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.common.snow.SnowKit;
import com.iohao.mmo.gift.GiftCodeType;
import com.iohao.mmo.gift.entity.GiftBag;
import com.iohao.mmo.gift.entity.GiftCode;
import com.iohao.mmo.gift.entity.GiftCodeRecord;
import com.iohao.mmo.gift.entity.GiftCodeUser;
import com.iohao.mmo.gift.mapper.GiftCodeMapper;
import com.iohao.mmo.gift.proto.GiftCodeMessage;
import com.iohao.mmo.gift.repository.GiftCodeRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Slf4j
@Service
@AllArgsConstructor
public class GiftCodeService {

    final GiftCodeRepository giftCodeRepository;

    final GiftCodeUserService giftCodeUserService;
    final GiftBagService giftBagService;

    public void useGiftCode(GiftCodeSegment giftCodeSegment, FlowContext flowContext) {

        // 礼包码信息
        String code = giftCodeSegment.getCode();
        GiftCode giftCode = giftCodeRepository.findByCode(code);
        GameCode.giftCodeInvalid.assertNonNull(giftCode);

        // 当前玩家领取礼包码记录
        long userId = flowContext.getUserId();
        GiftCodeUser giftCodeUser = giftCodeUserService.ofGiftCodeUser(userId);
        GameCode.giftCodeInvalid.assertTrueThrows(giftCodeUser.containsCode(code));

        // 礼包类型
        GiftCodeType giftCodeType = giftCodeSegment.getGiftCodeType();

        if (GiftCodeType.batchLimit == giftCodeType) {
            // 检查礼包码的数量是否已经达到领取上限
            GameCode.giftCodeInvalid.assertTrue(giftCode.hasLimit());
        }

        if (GiftCodeType.user == giftCodeType) {
            // 检查当前领取的玩家是否是所指定的玩家
            GameCode.giftCodeInvalid.assertTrue(giftCodeSegment.getUserId() == userId);
            // 检查礼包码的数量是否已经达到领取上限
            GameCode.giftCodeInvalid.assertTrue(giftCode.hasLimit());
        }

        // 玩家领取礼包码记录
        GiftCodeRecord record = new GiftCodeRecord();
        record.setCode(code);

        Map<String, GiftCodeRecord> giftCodeRecordMap = giftCodeUser.getGiftCodeRecordMap();
        giftCodeRecordMap.put(code, record);

        this.giftCodeUserService.save(giftCodeUser);

        // 更新礼包码信息，发放礼包
        giftCode.incrementQuantity();
        // 开启礼包
        rewardGiftBag(giftCode, flowContext);

        this.giftCodeRepository.save(giftCode);
    }

    private void rewardGiftBag(GiftCode giftCode, FlowContext flowContext) {
        log.info("开启礼包，userId:{}", flowContext.getUserId());
        // 发放礼包
        String giftBagId = giftCode.getGiftBagId();
        GiftBag giftBag = this.giftBagService.getGiftBag(giftBagId);
        this.giftBagService.openGiftBag(giftBag, flowContext);
    }

    public List<GiftCode> listGiftCode() {
        return giftCodeRepository.findAll();
    }

    public void save(GiftCode giftCode) {
        if (Objects.isNull(giftCode.getGiftBagId())) {
            // 如果没有礼包则随机关联一个礼包
            List<GiftBag> giftBags = this.giftBagService.listGiftBag();
            GiftBag giftBag = RandomKit.randomEle(giftBags);
            giftCode.setGiftBagId(giftBag.getId());
        }

        giftCodeRepository.save(giftCode);
    }

    public GiftCode create(GiftCodeMessage createMessage) {
        GiftCodeType giftCodeType = createMessage.giftCodeType;

        long lastDate = createMessage.lastLocalDateEpochDay;

        GiftCode giftCode = GiftCodeMapper.ME.convert(createMessage);
        giftCode.setId(SnowKit.next());

        long giftCodeId = giftCode.getId();

        String code = null;

        if (giftCodeType == GiftCodeType.batch) {
            code = HashIdKit.encode(
                    // 礼包类型
                    giftCodeType.getIndex(),
                    // 礼包码最后有效日期
                    lastDate,
                    // 唯一 id
                    giftCodeId
            );
        }

        if (giftCodeType == GiftCodeType.batchLimit) {
            long limit = Math.max(1, createMessage.limit);

            code = HashIdKit.encode(
                    // 礼包类型
                    giftCodeType.getIndex(),
                    // 礼包码最后有效日期
                    lastDate,
                    // 唯一 id
                    giftCodeId,
                    // 可领取的最大数量
                    limit

            );
        }

        if (giftCodeType == GiftCodeType.user) {
            code = HashIdKit.encode(
                    // 礼包类型
                    giftCodeType.getIndex(),
                    // 礼包码最后有效日期
                    lastDate,
                    // 唯一 id
                    giftCodeId,
                    // 指定玩家领取
                    createMessage.userId
            );
        }

        giftCode.setCode(code);

        return giftCode;
    }
}
