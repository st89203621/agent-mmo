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
package com.iohao.mmo.mail.service;

import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.bag.client.BagExchange;
import com.iohao.mmo.bag.proto.BagItemMessage;
import com.iohao.mmo.mail.entity.Mail;
import com.iohao.mmo.mail.entity.MailBox;
import com.iohao.mmo.mail.entity.MailStatusEnum;
import com.iohao.mmo.mail.mapper.MailAttachmentMapper;
import com.iohao.mmo.mail.repository.MailBoxRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * @author 渔民小镇
 * @date 2023-08-15
 */
@Service
@AllArgsConstructor
public class MailBoxService {
    final MailBoxRepository mailBoxRepository;

    public MailBox ofMailBox(long userId) {
        return mailBoxRepository.findById(userId).orElseGet(() -> {
            MailBox mailBox = new MailBox();
            mailBox.setUserId(userId);

            mailBox.setMails(new ArrayList<>());

            mailBoxRepository.save(mailBox);
            return mailBox;
        });
    }

    /**
     * 添加 Mail
     *
     * @param mail   Mail
     * @param userId 玩家 id
     */
    public void addMail(Mail mail, long userId) {
        MailBox mailBox = ofMailBox(userId);
        mailBox.addMail(mail);

        mailBoxRepository.save(mailBox);
    }

    public boolean deleteMail(String mailId, long userId) {
        // 删除指定邮件
        MailBox mailBox = ofMailBox(userId);

        List<Mail> mails = mailBox.getMails();
        boolean result = mails.removeIf(mail -> mail.getId().equals(mailId));

        if (result) {
            mailBoxRepository.save(mailBox);
        }

        return result;
    }

    public void deleteMails(long userId) {
        // 删除所有已开封和过期的邮件
        MailBox mailBox = ofMailBox(userId);

        boolean result = mailBox.getMails().removeIf(mail -> {
            // 是否已开封的邮件
            return mail.getMailStatus() == MailStatusEnum.OPEN
                    // 是否过期邮件
                    || mail.isExpire();
        });

        if (result) {
            mailBoxRepository.save(mailBox);
        }
    }

    public void openMail(String mailId, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        MailBox mailBox = ofMailBox(userId);

        Optional<Mail> optionalMail = mailBox.getMails()
                .stream()
                .filter(mail -> Objects.equals(mail.getId(), mailId))
                .filter(mail -> mail.getMailStatus() == MailStatusEnum.SEAL)
                .findFirst();

        ActionErrorEnum.dataNotExist.assertTrue(optionalMail.isPresent(), "邮件不存在或已领取");

        optionalMail.ifPresent(mail -> openMail(List.of(mail), mailBox, flowContext));
    }

    public void openMail(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        MailBox mailBox = ofMailBox(userId);

        // 密封的邮件、未开封的邮件
        List<Mail> list = mailBox.getMails().stream()
                .filter(mail -> mail.getMailStatus() == MailStatusEnum.SEAL)
                .toList();

        ActionErrorEnum.dataNotExist.assertTrueThrows(list.isEmpty(), "邮件不存在或已领取");

        openMail(list, mailBox, flowContext);
    }

    public void save(MailBox mailBox) {
        this.mailBoxRepository.save(mailBox);

    }

    private void openMail(List<Mail> processMails, MailBox mailBox, FlowContext flowContext) {
        // 需要处理的邮件列表
        processMails.forEach(mail -> mail.setMailStatus(MailStatusEnum.OPEN));
        save(mailBox);

        // 将邮件附件转为背包物品
        List<BagItemMessage> list = processMails.stream()
                // 需要有附件的邮件
                .filter(mail -> !mail.isEmpty())
                // 需要是未过期的邮件
                .filter(mail -> !mail.isExpire())
                // 邮件附件
                .flatMap(mail -> mail.getAttachments().stream())
                // 将附件转为背包物品
                .map(MailAttachmentMapper.ME::convert)
                .toList();

        // 调用背包模块，增加物品
        BagExchange.incrementItems(list, flowContext);
    }
}
