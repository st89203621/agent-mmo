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
package com.iohao.mmo.equip.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

/**
 * 装备额外属性
 *
 * @author 唐斌
 * @date 2023-07-30
 * @description:
 */
@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class ElseEquipPropertyMessage {
    /** 体质 */
    int constitution;
    /** 魔力 */
    int magicPower;
    /** 力量 */
    int power;
    /** 耐力 */
    int endurance;
    /** 敏捷 */
    int agile;

    public ElseEquipPropertyMessage() {
    }

    public ElseEquipPropertyMessage(int constitution, int magicPower, int power, int endurance, int agile) {
        this.constitution = constitution;
        this.magicPower = magicPower;
        this.power = power;
        this.endurance = endurance;
        this.agile = agile;
    }
}
