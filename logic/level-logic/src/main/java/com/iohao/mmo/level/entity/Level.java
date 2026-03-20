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
package com.iohao.mmo.level.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 等级
 * <pre>
 *     人物、宠物都可以用
 * </pre>
 *
 * @author 渔民小镇
 * @date 2023-07-30
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Level {
    /**
     * 主键
     * <pre>
     *     userId or 宠物id
     * </pre>
     */
    @Id
    long id;
    /** 经验值 */
    long exp;
    /** 当前等级 */
    int level;

    public void addExp(int exp) {
        this.exp += exp;
    }

    public void incrementLevel() {
        this.level++;
    }
}
