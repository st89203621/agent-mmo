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
package com.iohao.game.common.kit;

import lombok.Setter;
import lombok.experimental.UtilityClass;

/**
 * @author 渔民小镇
 * @date 2024-02-17
 */
@UtilityClass
public class HashIdKit {
    String ALPHABET = "abcdefghijklmnopqrstuvwxyz1234567890";
    @Setter
    Hashids hashids = new Hashids("salt-ioGame", 4, ALPHABET);

    public String encode(long... values) {
        return hashids.encode(values);
    }

    public long[] decode(String hash) {
        return hashids.decode(hash);
    }
}
