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
package com.iohao.mmo.common.kit;

import com.iohao.game.common.kit.SafeKit;
import com.iohao.game.common.kit.StrKit;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

/**
 * @author 渔民小镇
 * @date 2023-08-22
 */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommonSplitParam {
    String[] split;

    public CommonSplitParam(String text) {
        this(text, "_");
    }

    public CommonSplitParam(String text, String regex) {
        if (StrKit.isEmpty(text)) {
            text = "";
        }

        this.split = text.split(regex);
    }

    public int getInt(int index, int defaultValue) {
        return index >= split.length ? defaultValue : SafeKit.getInt(split[index], defaultValue);
    }

    public String getString(int index, String defaultValue) {
        return index >= split.length ? defaultValue : split[index];
    }

    public String getString(int index) {
        return getString(index, null);
    }
}
