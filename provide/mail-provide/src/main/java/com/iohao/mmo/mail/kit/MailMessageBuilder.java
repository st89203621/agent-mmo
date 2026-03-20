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
package com.iohao.mmo.mail.kit;

import com.iohao.game.common.kit.time.CacheTimeKit;
import com.iohao.mmo.common.provide.proto.AttachmentMessage;
import com.iohao.mmo.mail.proto.MailMessage;
import com.iohao.mmo.mail.proto.MailStatusMessageEnum;
import lombok.AccessLevel;
import lombok.Setter;
import lombok.experimental.Accessors;
import lombok.experimental.FieldDefaults;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * 邮件构建器
 *
 * @author 渔民小镇
 * @date 2023-08-15
 */
@Setter
@Accessors(chain = true)
@FieldDefaults(level = AccessLevel.PRIVATE)
public final class MailMessageBuilder {
    /** 邮件主题 */
    String subject;
    /** 邮件正文 */
    String body;

    /** 发件人 */
    String senderName;
    /** 发件人 userId */
    Long senderUserId;
    /** 邮件附件（奖励） */
    @Setter(AccessLevel.PRIVATE)
    List<AttachmentMessage> attachments = new ArrayList<>();
    /**
     * 邮件过期时间，默认 30 后天过期
     * <pre>
     *     Duration.ofDays(2); 表示两天后过期
     * </pre>
     */
    Duration duration = Duration.ofDays(30);

    MailMessageBuilder() {
    }

    public static MailMessageBuilder newBuilder() {
        return new MailMessageBuilder();
    }

    public static MailMessageBuilder newSystemMailBuilder(String body) {
        MailMessageBuilder mailMessageBuilder = new MailMessageBuilder();

        mailMessageBuilder.subject = "系统邮件";
        mailMessageBuilder.senderName = "系统";
        mailMessageBuilder.senderUserId = 0L;
        mailMessageBuilder.body = body;

        return mailMessageBuilder;
    }

    /**
     * 添加奖励附件
     *
     * @param itemTypeId 物品类型 id
     * @param quantity   奖励数量
     * @return MailBuilder
     */
    public MailMessageBuilder addAttachment(String itemTypeId, int quantity) {

        AttachmentMessage attachmentMessage = AttachmentMessage.create(itemTypeId, quantity);

        attachments.add(attachmentMessage);

        return this;
    }

    /**
     * 接收邮件的玩家
     *
     * @return InternalMailMessage
     */
    public MailMessage build() {
        Objects.requireNonNull(subject);
        Objects.requireNonNull(body);
        Objects.requireNonNull(senderName);
        Objects.requireNonNull(senderUserId);
        Objects.requireNonNull(duration);

        // 奖励邮件
        MailMessage mailMessage = new MailMessage();
        mailMessage.senderName = senderName;
        mailMessage.senderUserId = senderUserId;
        mailMessage.subject = subject;
        mailMessage.body = body;
        mailMessage.milliseconds = CacheTimeKit.currentTimeMillis();
        mailMessage.expiredMilliseconds = mailMessage.milliseconds + duration.toMillis();
        mailMessage.attachments = this.attachments;
        mailMessage.mailStatus = MailStatusMessageEnum.SEAL;

        return mailMessage;
    }
}
