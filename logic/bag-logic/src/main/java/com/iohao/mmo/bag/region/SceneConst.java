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
package com.iohao.mmo.bag.region;

/**
 * 物品使用的业务场景
 *
 * @author 渔民小镇
 * @date 2023-08-08
 */
public interface SceneConst {
    /**
     * 业务场景 - 简单的使用背包物品
     * <pre>
     *     通常是使用同一种背包物品，如
     *     增加 hp 的药品、增加经验值的道具...等
     * </pre>
     */
    String defaultScene = "default";
    /**
     * 业务场景 - 打造装备
     * <pre>
     *     使用多种不同的背包物品来打造装备，如打造书、材料铁...等
     * </pre>
     */
    String buildEquipScene = "buildEquip";
}
