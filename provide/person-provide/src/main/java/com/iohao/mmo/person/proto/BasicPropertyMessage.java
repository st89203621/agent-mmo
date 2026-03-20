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
package com.iohao.mmo.person.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

/**
 * 人物基础属性
 *
 * @author 渔民小镇
 * @date 2023-07-23
 */
@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class BasicPropertyMessage {
    /** 生命值 */
    int hp;
    /** 魔法值 */
    int mp;
    /** 物理攻击 */
    int physicsAttack;
    /** 物理防御 */
    int physicsDefense;
    /** 魔法攻击 */
    int magicAttack;
    /** 魔法防御 */
    int magicDefense;
    /** 治疗强度 */
    int treatAttack;
    /** 封印强度 */
    int sealAttack;
    /** 封印防御（抵抗封印） */
    int sealDefense;
    /** 速度 */
    int speed;
    /** 怒气 */
    int anger;
}
