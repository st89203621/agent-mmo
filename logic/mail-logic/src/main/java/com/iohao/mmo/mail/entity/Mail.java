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
package com.iohao.mmo.mail.entity;

import com.iohao.game.common.kit.CollKit;
import com.iohao.game.common.kit.time.ExpireTimeKit;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * 玩家邮件
 *
 * @author 渔民小镇
 * @date 2023-08-15
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Mail {
    @Id
    String id;
    /** 发件人 */
    String senderName;
    /** 发件人 userId */
    long senderUserId;
    /** 邮件主题 */
    String subject;
    /** 邮件正文 */
    String body;
    /** 发送时间 */
    long milliseconds;
    /** 过期时间 */
    long expiredMilliseconds;
    /** 邮件状态 */
    MailStatusEnum mailStatus;
    /** 附件（奖励） */
    List<MailAttachment> attachments;

    public void addMailAttachment(MailAttachment attachment) {
        if (Objects.isNull(attachments)) {
            this.attachments = new ArrayList<>();
        }

        this.attachments.add(attachment);
    }

    /**
     * @return true 表示邮件没有附件
     */
    public boolean isEmpty() {
        return CollKit.isEmpty(this.attachments);
    }

    /**
     * @return true 表示邮件已经过期
     */
    public boolean isExpire() {
        return ExpireTimeKit.expireMillis(expiredMilliseconds);
    }
}
