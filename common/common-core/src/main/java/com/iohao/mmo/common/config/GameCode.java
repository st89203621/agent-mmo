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
package com.iohao.mmo.common.config;

import com.iohao.game.action.skeleton.core.exception.MsgExceptionInfo;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

/**
 * @author 渔民小镇
 * @date 2023-07-27
 */
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public enum GameCode implements MsgExceptionInfo {

    /** 地图不存在 */
    mapNotExist(1, "地图不存在"),
    /** 升级错误，经验值不足 */
    upLevelError(2, "升级错误，经验值不足"),
    /** 背包物品数量不足 */
    quantityNotEnough(3, "背包物品数量不足"),
    /** 操作对象错误 */
    objNotFound(4, "操作对象错误"),
    /** 可分配属性点不足 */
    allotNotEnough(5, "分配异常，属性点不足"),
    /** 宝宝技能不存在 */
    petSkillNotExist(6, "宝宝技能不存在"),
    /** 宝宝不存在 */
    petNotExist(7, "宝宝不存在"),
    /** 礼包码类型不存在 */
    giftCodeTypeNotExist(8, "礼包码类型不存在"),
    /** 礼包码失效 */
    giftCodeInvalid(9, "礼包码失效"),
    /** 登录失效 */
    loginVerify(10, "登录失效"),
    /** 用户名已存在 */
    usernameExists(11, "用户名已存在"),
    /** 登录失败 */
    loginFailed(12, "用户名或密码错误"),
    ;

    /** 消息码 */
    final int code;
    /** 消息模板 */
    final String msg;

    GameCode(int code, String msg) {
        this.code = code;
        this.msg = msg;
    }
}
