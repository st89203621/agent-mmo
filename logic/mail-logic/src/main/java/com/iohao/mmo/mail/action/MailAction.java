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
package com.iohao.mmo.mail.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.common.kit.CollKit;
import com.iohao.mmo.mail.cmd.MailCmd;
import com.iohao.mmo.mail.entity.Mail;
import com.iohao.mmo.mail.entity.MailBox;
import com.iohao.mmo.mail.mapper.MailMapper;
import com.iohao.mmo.mail.proto.MailMessage;
import com.iohao.mmo.mail.proto.MailStatusMessageEnum;
import com.iohao.mmo.mail.service.MailBoxService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

/**
 * @author 渔民小镇
 * @date 2023-08-15
 */
@Slf4j
@Component
@ActionController(MailCmd.cmd)
public class MailAction {
    @Resource
    MailBoxService mailBoxService;

    /**
     * 查看玩家邮件列表
     *
     * @param flowContext flowContext
     * @return 玩家邮件
     */
    @ActionMethod(MailCmd.listMail)
    public List<MailMessage> listMail(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        MailBox mailBox = mailBoxService.ofMailBox(userId);

        return MailMapper.ME.convertMails(mailBox.getMails());
    }

    /**
     * 批量添加新邮件
     *
     * @param internalMailMessages 邮件
     */
    @ActionMethod(MailCmd.addMail)
    public void internalAddMail(List<MailMessage> internalMailMessages, FlowContext flowContext) {
        if (CollKit.isEmpty(internalMailMessages)) {
            return;
        }

        internalMailMessages.stream()
                .filter(Objects::nonNull)
                .forEach(mailMessage -> {

                    mailMessage.mailStatus = MailStatusMessageEnum.SEAL;
                    mailMessage.id = new ObjectId().toString();

                    Mail mail = MailMapper.ME.convert(mailMessage);
                    long userId = flowContext.getUserId();
                    this.mailBoxService.addMail(mail, userId);

                    // 新邮件通知
                    CmdInfo cmdInfo = MailCmd.of(MailCmd.broadcastNewMail);
                    flowContext.broadcastMe(cmdInfo, mailMessage);
                });
    }

    /**
     * 删除单个邮件-指定邮件
     *
     * @param mailId      email Id
     * @param flowContext flowContext
     * @return true 表示删除成功
     */
    @ActionMethod(MailCmd.deleteMail)
    public boolean deleteMail(String mailId, FlowContext flowContext) {
        long userId = flowContext.getUserId();

        boolean result = mailBoxService.deleteMail(mailId, userId);

        ActionErrorEnum.dataNotExist.assertTrue(result);

        return result;
    }

    /**
     * 一键删除多个邮件，删除所有已开封和过期的邮件
     *
     * @param flowContext flowContext
     * @return true；如要需要可以重读一次 listMail
     */
    @ActionMethod(MailCmd.deleteMails)
    public boolean deleteMails(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        mailBoxService.deleteMails(userId);
        return true;
    }

    /**
     * 领取指定未开封的邮件
     *
     * @param mailId      邮件 id
     * @param flowContext flowContext
     */
    @ActionMethod(MailCmd.openMail)
    public void openMail(String mailId, FlowContext flowContext) {
        this.mailBoxService.openMail(mailId, flowContext);
    }

    /**
     * 一键领取所有未开封的邮件
     *
     * @param flowContext flowContext
     */
    @ActionMethod(MailCmd.openMails)
    public void openMails(FlowContext flowContext) {
        this.mailBoxService.openMail(flowContext);
    }
}