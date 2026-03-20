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
package com.iohao.mmo.client.input;

import com.iohao.game.action.skeleton.protocol.wrapper.StringValue;
import com.iohao.game.action.skeleton.protocol.wrapper.WrapperKit;
import com.iohao.game.common.kit.time.FormatTimeKit;
import com.iohao.game.external.client.AbstractInputCommandRegion;
import com.iohao.game.external.client.kit.ScannerKit;
import com.iohao.mmo.client.common.item.ItemTypeNode;
import com.iohao.mmo.client.common.item.ItemTypeNodeKit;
import com.iohao.mmo.common.provide.item.ItemTypeIdConst;
import com.iohao.mmo.common.provide.proto.AttachmentMessage;
import com.iohao.mmo.mail.cmd.MailCmd;
import com.iohao.mmo.mail.kit.MailMessageBuilder;
import com.iohao.mmo.mail.proto.MailMessage;
import com.iohao.mmo.mail.proto.MailStatusMessageEnum;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author 渔民小镇
 * @date 2023-08-15
 */
@Slf4j
public class MailInputCommandRegion extends AbstractInputCommandRegion {
    @Override
    public void initInputCommand() {
        this.inputCommandCreate.cmd = MailCmd.cmd;
        this.inputCommandCreate.cmdName = "邮件";

        request();
        listen();
    }

    private void request() {
        ofCommand(MailCmd.listMail).setTitle("查看玩家邮件列表").callback(result -> {
            var list = result.listValue(MailMessage.class);
            log.info("查看玩家邮件列表 - 总数: {}", list.size());
            list.stream()
                    .map(MailToString::new)
                    .forEach(mailToString -> {
                        log.info(mailToString.format, mailToString.arguments);
                        System.out.println("-------------------------------------------------------");
                    });
        });

        ofCommand(MailCmd.addMail).setTitle("内部 action - 给玩家奖励一个【系统邮件】").setRequestData(() -> {
            String body = "玩家编号[%s]，系统感觉你今天很弱鸡，特意送你一些物品";

            MailMessageBuilder mailMessageBuilder = MailMessageBuilder
                    .newSystemMailBuilder(String.format(body, userId))
                    .addAttachment(ItemTypeIdConst.expId, 2)
                    .addAttachment(ItemTypeIdConst.equipWeaponBook10, 1)
                    .addAttachment(ItemTypeIdConst.iron10, 1);

            var mailMessage = mailMessageBuilder.build();
            return WrapperKit.ofListByteValue(List.of(mailMessage));
        });

        ofCommand(MailCmd.deleteMail).callback(result -> {
            var value = result.getBoolean();
            log.info("删除{}", value ? "成功" : "失败");
        }).setTitle("删除指定邮件").setRequestData(() -> {
            ScannerKit.log(() -> log.info("输入需要删除的邮件 id"));
            String inputType = ScannerKit.nextLine("1");
            return StringValue.of(inputType);
        });

        ofCommand(MailCmd.deleteMails).callback(result -> {
            var value = result.getBoolean();
            log.info("删除成功 {}", value);
        }).setTitle("一键删除所有已开封和过期的邮件");

        ofCommand(MailCmd.openMail).setTitle("领取指定未开封的邮件").setRequestData(() -> {
            ScannerKit.log(() -> log.info("输入需要领取的邮件 id"));
            String inputType = ScannerKit.nextLine("1");
            return StringValue.of(inputType);
        });

        ofCommand(MailCmd.openMails).setTitle("一键领取所有未开封的邮件");
    }

    private void listen() {
        ofListen(result -> {
            MailMessage mailMessage = result.getValue(MailMessage.class);
            log.info("-----接收新邮件-----");
            MailToString mailToString = new MailToString(mailMessage);
            log.info(mailToString.format, mailToString.arguments);
        }, MailCmd.broadcastNewMail, "接收新邮件");
    }

    static class MailToString {
        String format;
        Object[] arguments;

        public MailToString(MailMessage mailMessage) {
            format = """
                                       \s
                    【邮件主题 {}】【邮件id {}】【邮件状态:{}】
                    【发送时间：{} --- 过期时间：{}】
                    【邮件正文】{}
                    【附件（奖励）列表】{}
                   \s""";

            String mailAttachmentStr = mailMessage.attachments
                    .stream()
                    .map(this::convert)
                    .map(ItemTypeNodeKit::toString)
                    .collect(Collectors.joining());

            List<Object> list = new ArrayList<>();
            list.add(mailMessage.subject);
            list.add(mailMessage.id);
            list.add(mailMessage.mailStatus == MailStatusMessageEnum.SEAL ? "未领取" : "已经领取");
            list.add(FormatTimeKit.format(mailMessage.milliseconds));
            list.add(FormatTimeKit.format(mailMessage.expiredMilliseconds));
            list.add(mailMessage.body);
            list.add(mailAttachmentStr);

            arguments = list.toArray();
        }

        ItemTypeNode convert(AttachmentMessage attachmentMessage) {
            return new ItemTypeNode(attachmentMessage.itemTypeId, attachmentMessage.quantity);
        }
    }
}