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
package com.iohao.mmo.client.input;

import com.iohao.game.action.skeleton.protocol.wrapper.WrapperKit;
import com.iohao.game.external.client.AbstractInputCommandRegion;
import com.iohao.game.external.client.kit.ScannerKit;
import com.iohao.mmo.gift.GiftCodeType;
import com.iohao.mmo.gift.cmd.GiftCodeCmd;
import com.iohao.mmo.gift.proto.GiftCodeMessage;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@Slf4j
public class GiftCodeInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = GiftCodeCmd.cmd;
        this.inputCommandCreate.cmdName = "礼包码";

        ofCommand(GiftCodeCmd.createGiftCode).setTitle("internal 创建礼包码").setRequestData(() -> {
            ScannerKit.log(() -> log.info("""
                                        
                    --- 生成礼包码类型 ---
                    输入 0，将生成批量礼包码 - 无限量礼包。
                    输入 1，将生成限量礼包。
                    输入 2，将生成指定玩家可领取的礼包（默认自己）。
                    """));

            var inputType = ScannerKit.nextLong(2L);

            GiftCodeType giftCodeType = GiftCodeType.valueOf(inputType);

            GiftCodeMessage giftCodeMessage = new GiftCodeMessage();
            giftCodeMessage.giftCodeType = giftCodeType;

            // 礼包码有效日期
            LocalDate lastDate = LocalDate.now().plusDays(3);
            giftCodeMessage.lastLocalDateEpochDay = lastDate.toEpochDay();

            if (GiftCodeType.batchLimit == giftCodeType) {
                // 限量礼包码的领取上限（默认值）
                giftCodeMessage.limit = 10;
            }

            if (GiftCodeType.user == giftCodeType) {
                // 指定玩家可领取的礼包（默认值为自己）
                giftCodeMessage.userId = this.userId;
                giftCodeMessage.limit = 1;
            }

            return giftCodeMessage;
        }).callback(result -> {
            var giftCodeMessage = result.getValue(GiftCodeMessage.class);

            String text = giftCodeToString(giftCodeMessage);

            log.info("\n--- 礼包码信息 ---\n{}", text);
        });

        ofCommand(GiftCodeCmd.listGiftCode).setTitle("internal 礼包码列表").callback(result -> {
            List<GiftCodeMessage> giftCodeMessages = result.listValue(GiftCodeMessage.class);

            log.info("\n--- 礼包码信息列表 ---");
            for (GiftCodeMessage giftCodeMessage : giftCodeMessages) {
                System.out.println(giftCodeToString(giftCodeMessage));
            }
        });

        ofCommand(GiftCodeCmd.useGiftCode).setTitle("使用礼包码").setRequestData(() -> {
            ScannerKit.log(() -> log.info("请输入需要兑换的礼包码"));
            String giftCode = ScannerKit.nextLine("");
            return WrapperKit.of(giftCode);
        });
    }

    private String giftCodeToString(GiftCodeMessage giftCodeMessage) {
        String format = """
                礼包码类型 : %s - %s
                礼包码最后有效日期 : %s
                礼包数量 : %s
                指定玩家领取 : %s
                礼包码 : %s
                已经领取的数量 : %s
                """;

        return String.format(format,
                giftCodeMessage.giftCodeType.getIndex(), giftCodeMessage.giftCodeType.getName(),
                giftCodeMessage.lastLocalDateEpochDay,
                giftCodeMessage.limit,
                giftCodeMessage.userId,

                giftCodeMessage.code,
                giftCodeMessage.quantity
        );
    }
}