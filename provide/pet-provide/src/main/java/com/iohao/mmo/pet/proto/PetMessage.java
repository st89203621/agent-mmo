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
package com.iohao.mmo.pet.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;
import lombok.AccessLevel;
import lombok.ToString;
import lombok.experimental.FieldDefaults;

import java.util.Map;

/**
 * 宠物（宝宝）
 *
 * @author 渔民小镇
 * @date 2023-08-30
 */
@ToString
@ProtobufClass
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class PetMessage {
    String id;
    /** 所属宠物 */
    String petTemplateId;
    /** 昵称 */
    String nickname;
    /** 进化经验值 */
    int mutationExp;

    /** 形态变化的编号 */
    int mutationNo;
    /** 当前使用的形态模型 */
    String mutationSkin;
    /** 可分配的属性点数量 */
    int propertyPointNum;

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

    /** 最大技能数量上限 */
    int maxSkill;

    Map<Integer, PetSkillMessage> skillMap;

    /** AI生成的宠物形象URL */
    String aiImageUrl;
    /** 宠物种类 */
    String petType;
    /** 元素属性 */
    String element;
    /** 艺术风格 */
    String artStyle;
}
