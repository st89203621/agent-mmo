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
package com.iohao.mmo.bag.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.mmo.bag.cmd.ItemCmd;
import com.iohao.mmo.bag.entity.ItemTypeConfig;
import com.iohao.mmo.bag.mapper.ItemMapper;
import com.iohao.mmo.bag.proto.ItemMessage;
import com.iohao.mmo.bag.region.ItemTypeConfigRegion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 物品配置相关
 *
 * @author 渔民小镇
 * @date 2023-08-15
 */
@Slf4j
@Component
@ActionController(ItemCmd.cmd)
public class ItemAction {
    /**
     * 物品列表
     *
     * @return 物品列表
     */
    @ActionMethod(ItemCmd.listItem)
    public List<ItemMessage> listItem() {
        Collection<ItemTypeConfig> values = ItemTypeConfigRegion.values();
        return ItemMapper.ME.convert(values);
    }
}