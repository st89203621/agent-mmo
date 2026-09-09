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
import com.iohao.game.common.kit.StrKit;
import com.iohao.game.common.kit.time.ExpireTimeKit;
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.gift.GiftCodeType;
import com.iohao.mmo.gift.cmd.GiftCodeCmd;
import com.iohao.mmo.gift.entity.GiftCode;
import com.iohao.mmo.gift.mapper.GiftCodeMapper;
import com.iohao.mmo.gift.proto.GiftCodeMessage;
import com.iohao.mmo.gift.service.GiftCodeSegment;
import com.iohao.mmo.gift.service.GiftCodeService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Slf4j
@Component
@ActionController(GiftCodeCmd.cmd)
public class GiftCodeAction {

    @Resource
    GiftCodeService giftCodeService;

    /**
     * 内部 - 查询礼包码列表
     *
     * @return 礼包码列表
     */
    @ActionMethod(GiftCodeCmd.listGiftCode)
    public List<GiftCodeMessage> internalListGiftCode() {
        List<GiftCode> giftCodes = this.giftCodeService.listGiftCode();
        return GiftCodeMapper.ME.convertGiftCodeMessages(giftCodes);
    }

    /**
     * 内部 - 生成礼包码
     *
     * @param createMessage 礼包码创建信息
     * @return GiftCodeMessage
     */
    @ActionMethod(GiftCodeCmd.createGiftCode)
    public GiftCodeMessage internalCreateGiftCode(GiftCodeMessage createMessage) {

        GiftCodeType giftCodeType = createMessage.giftCodeType;
        GameCode.giftCodeTypeNotExist.assertTrueThrows(giftCodeType.isEmpty());

        // 生成礼包码信息
        GiftCode giftCode = this.giftCodeService.create(createMessage);

        GameCode.giftCodeTypeNotExist.assertTrueThrows(StrKit.isEmpty(giftCode.getCode()));

        this.giftCodeService.save(giftCode);

        return GiftCodeMapper.ME.convert(giftCode);
    }

    /**
     * 使用礼包码
     *
     * @param giftCode    礼包码
     * @param flowContext flowContext
     */
    @ActionMethod(GiftCodeCmd.useGiftCode)
    public void useGiftCode(String giftCode, FlowContext flowContext) {

        GiftCodeSegment giftCodeSegment = new GiftCodeSegment(giftCode);
        GameCode.giftCodeInvalid.assertTrue(giftCodeSegment.isValid());

        // 礼包类型
        GiftCodeType giftCodeType = giftCodeSegment.getGiftCodeType();
        GameCode.giftCodeInvalid.assertTrueThrows(giftCodeType.isEmpty());

        // 礼包码最后有效日期验证
        long lastDate = giftCodeSegment.getLastDate();
        GameCode.giftCodeInvalid.assertTrueThrows(ExpireTimeKit.expireLocalDate(lastDate));

        // 使用礼包码
        log.info("使用礼包码 ，userId:{}", flowContext.getUserId());
        this.giftCodeService.useGiftCode(giftCodeSegment, flowContext);
    }
}